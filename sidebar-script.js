const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const modelSelector = document.getElementById('model-selector');

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'textSelected') {
        document.getElementById('user-input').value = request.text;
    }
});

async function sendMessage() {
    const userMessage = userInput.value.trim();
    const selectedModel = modelSelector.value;

    let pdfText = '';

    // Check if a PDF is selected and extract text
    const pdfInput = document.getElementById('pdf-upload');
    if (pdfInput.files[0]) {
        pdfText = await extractPdfText(pdfInput.files[0]);
    }

    // Combine user message with PDF text
    const combinedMessage = pdfText ? `${pdfText}\n${userMessage}` : userMessage;

    if (combinedMessage !== '') {
        displayMessage('user', userMessage);
        userInput.value = '';

        // Send the combined message to the background script
        window.parent.postMessage({
            type: 'userMessage',
            text: combinedMessage,
            model: selectedModel
        }, '*');
    }
}

async function extractPdfText(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    try {
        const response = await fetch('https://chrome-extension-backend-1.onrender.com/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.log('the data was ' + data);
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

// In sidebar-script.js
document.getElementById('pdf-upload').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('pdf', file);

        fetch('https://yourbackend.com/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                // Send data.text to ChatGPT or handle it as needed
            })
            .catch(error => console.error('Error:', error));
    }
});


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