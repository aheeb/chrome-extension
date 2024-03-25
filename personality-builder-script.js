// In sidebar-script.js and personality-builder-script.js
let conversationHistory = [];
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


document.getElementById('build-personality').addEventListener('click', function () {
    let selectedProfessions = [];
    let selectedTraits = [];

    // List of all professions for comparison
    const professionsList = ["Programmer", "Accountant", "Engineer", "Teacher", "Doctor",
        "Lawyer", "Artist", "Scientist", "Writer", "Chef",
        "Journalist", "Architect", "Pharmacist", "Nurse",
        "Graphic Designer", "Web Developer", "Psychologist",
        "Veterinarian", "Marketing Specialist", "Financial Analyst"];

    document.querySelectorAll('#personality-builder input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.checked) {
            if (professionsList.includes(checkbox.value)) {
                // Add to professions array
                selectedProfessions.push(checkbox.value);
            } else {
                // Add to traits array
                selectedTraits.push(checkbox.value);
            }
        }
    });
    // Combine arrays or process them as needed
    let personalityProfile = [...selectedProfessions, ...selectedTraits];
    let prompt = 'make a new personality profile with the following traits: ' + personalityProfile.join(', ');
    let key = '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'
    conversationHistory.push({ role: 'user', content: prompt });
    fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
            "model": 'gpt-3.5-turbo-0125',
            "messages": conversationHistory,
            "temperature": 0.5
        }),
    })
        .then(response => response.json())
        .then(data => {
            const chatGptResponse = data.choices[0].message.content.trim();
            console.log('Success:', chatGptResponse);

            // Check if user is logged in and send response to backend
            chrome.storage.local.get(['isLoggedIn', 'authToken'], function (result) {
                console.log(result.isLoggedIn);
                if (result.isLoggedIn) {
                    saveResponseToBackend(chatGptResponse, result.authToken);
                }
            });

        })
        .catch(error => {
            console.error('Error:', error);
        });
});

async function saveResponseToBackend(response, authToken) {
    console.log('Saving response to backend:', response);

    let userIdTest = await chrome.storage.local.get('userId');
    let userId = userIdTest.userId;
    fetch('https://chrome-extension-backend-1.onrender.com/save-response', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json' // If you're using token-based auth
        },
        body: JSON.stringify({
            personality: response,
            userId: userId
        })
    })
        .then(res => res.json())
        .then(data => {
            console.log('Response saved to backend:', data);
        })
        .catch(error => {
            console.error('Error saving response:', error);
        });
}

