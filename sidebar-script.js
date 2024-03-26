const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const modelSelector = document.getElementById('model-selector');
const authContainer = document.getElementById('auth-container');
const chatInterface = document.getElementById('chat-container');
let selectedCloudFileContent = '';



document.getElementById('cloud-storage-button').addEventListener('click', async () => {
    let userId = await chrome.storage.local.get('userId');
    try {
        const response = await fetch(`http://localhost:3000/get-user-files/${userId.userId}`, {
            method: 'GET'
        });
        const files = await response.json();
        populateFileDropdown(files);
    } catch (error) {
        console.error('Error fetching files:', error);
    }
});

document.getElementById('cloud-files-select').addEventListener('change', async (event) => {
    let userId = await chrome.storage.local.get('userId');
    const fileName = event.target.value;
    if (fileName == "") {
        selectedCloudFileContent = '';
        return;
    }
    if (fileName) {
        try {
            const response = await fetch(`http://localhost:3000/get-file-content?fileName=${fileName}&userId=${userId.userId}`, {
                method: 'GET'
            });
            const fileContent = await response.text();
            selectedCloudFileContent = fileContent;
            // Do something with fileContent, like setting it in the chat input
        } catch (error) {
            console.error('Error fetching file content:', error);
        }
    }
});

function populateFileDropdown(files) {
    const select = document.getElementById('cloud-files-select');
    select.innerHTML = '<option value="">Select a file...</option>';
    files.forEach(file => {
        const option = document.createElement('option');
        option.value = file.name;
        option.textContent = file.name;
        select.appendChild(option);
    });
}

chrome.storage.local.get(['isLoggedIn'], function (result) {
    if (result.isLoggedIn) {
        showChatInterface();
    } else {
        showAuthInterface();
    }
});

function showChatInterface() {
    authContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    document.getElementById('logout-button').style.display = 'block';
}

function showAuthInterface() {
    authContainer.style.display = 'block';
    chatContainer.style.display = 'none';
    document.getElementById('logout-button').style.display = 'none';
}

document.getElementById('logout-button').addEventListener('click', function () {
    chrome.storage.local.set({ isLoggedIn: false }, function () {
        authContainer.style.display = 'block';
        chatInterface.style.display = 'none';
        document.getElementById('logout-button').style.display = 'none';
        // Optionally, clear conversation history or take other cleanup actions
    });
});



sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
async function fetchPersonalities() {
    let userId = await chrome.storage.local.get('userId');
    fetch(`https://chrome-extension-backend-1.onrender.com/get-personalities/${userId.userId}`, {
        method: 'GET',
        credentials: 'include' // Important for session handling
    })
        .then(response => response.json())
        .then(data => {
            displayPersonalities(data.personalities);
        })
        .catch(error => console.error('Fetch error:', error));
}

function displayPersonalities(personalities) {
    const select = document.getElementById('personalities-select');
    select.innerHTML = ''; // Clear existing options

    personalities.forEach(personality => {
        const option = document.createElement('option');
        option.value = personality.personality; // Assuming there's an 'id' field
        option.textContent = personality.personality; // Adjust according to your data structure
        select.appendChild(option);
    });
    let option2 = document.createElement('option');
    option2.value = 'none';
    option2.textContent = 'None';
    select.appendChild(option2);
}


fetchPersonalities();


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'textSelected') {
        document.getElementById('user-input').value = request.text;
    }
});

async function sendMessage() {
    const userMessage = userInput.value.trim();
    const selectedModel = modelSelector.value;
    const personality = document.getElementById('personalities-select').value;

    let pdfText = '';
    let additionalContext = '';
    let fileContext = selectedCloudFileContent;
    // Check if a PDF is selected and extract text
    const pdfInput = document.getElementById('pdf-upload');
    if (pdfInput.files[0]) {
        pdfText = await extractPdfText(pdfInput.files[0]);
    }

    // Optionally add current webpage context
    const includeWebpageContext = document.getElementById('use-webpage-context').checked;
    if (includeWebpageContext) {
        additionalContext = await getCurrentWebpageContext();
    }

    // Combine user message with PDF text and additional context
    const combinedMessage = (personality ? "You should act like this personality: Personality: " + personality + "\n" : '') +
        (pdfText ? "PDF Context:\n" + pdfText : '') + (fileContext ? "File Context:\n" + fileContext : '') +
        (additionalContext ? "\n\nWebpage Context:\n" + additionalContext : '') +
        "\n\n" + userMessage;

    if (combinedMessage !== '') {
        displayMessage('user', userMessage);
        userInput.value = '';

        // Send the combined message to the background script
        window.parent.postMessage({
            type: 'userMessage',
            text: combinedMessage,
            model: selectedModel,
            API_KEY: window._env_.API_KEY
        }, '*');
    }
}

async function getCurrentWebpageContext() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "getPageContent" }, function (response) {
                if (response && response.content) {
                    resolve(response.content);
                } else {
                    resolve(''); // Resolve with an empty string if no response or content
                }
            });
        });
    });
}

// Add to sidebar-script.js

document.getElementById('toggle-auth').addEventListener('click', function () {
    const loginForm = document.getElementById('login-form');
    const registrationForm = document.getElementById('registration-form');
    const toggleButton = document.getElementById('toggle-auth');

    if (loginForm.style.display === 'none') {
        registrationForm.style.display = 'none';
        loginForm.style.display = 'block';
        toggleButton.textContent = 'Register';
    } else {
        loginForm.style.display = 'none';
        registrationForm.style.display = 'block';
        toggleButton.textContent = 'Login';
    }
});
// In sidebar-script.js and personality-builder-script.js

window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'iframeLoaded') {
        setupInternalNavigation();
    }
});

function setupInternalNavigation() {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const href = link.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        });
    });
}


document.getElementById('login-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('https://chrome-extension-backend-1.onrender.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (data.status === 'success') {
            // Assume the backend returns a success status and an auth token
            chrome.storage.local.set({ isLoggedIn: true, authToken: data.authToken, userId: data.userId });
            authContainer.style.display = 'none';
            chatInterface.style.display = 'block';
            // You might want to store the authToken for future requests
        } else {
            // Handle errors, show a message to the user
            console.error('Login failed:', data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
    }
});


document.getElementById('registration-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('https://chrome-extension-backend-1.onrender.com/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (data.status === 'success') {
            // Assume the backend returns a success status
            chrome.storage.local.set({ isLoggedIn: true });
            authContainer.style.display = 'none';
            chatInterface.style.display = 'block';
            // You might also want to log the user in automatically
        } else {
            // Handle errors, show a message to the user
            console.error('Registration failed:', data.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
    }
});



async function extractPdfText(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    try {
        const response = await fetch('https://chrome-extension-backend-1.onrender.com/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Error:', error);
        return '';
    }
}

const clearButton = document.getElementById('clear-button');
clearButton.addEventListener('click', clearHistory);

function clearHistory() {
    chatContainer.innerHTML = ''; // Clear chat display
    window.parent.postMessage({ type: 'clearHistory' }, '*'); // Inform main script
}

// Modify the existing sendMessage function...

function displayMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.textContent = message;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Listen for messages from the background script
window.addEventListener('message', (event) => {
    if (event.data.type === 'loadHistory') {
        event.data.history.forEach(msg => {
            displayMessage(msg.role, msg.content);
        });
    } else if (event.data.type === 'assistantMessage') {
        const assistantMessage = event.data.text;
        displayMessage('assistant', assistantMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});