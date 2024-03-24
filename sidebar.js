let sidebarVisible = false;
let sidebarIframe = null;
let conversationHistory = [];

function createSidebar() {
    sidebarIframe = document.createElement('iframe');
    sidebarIframe.src = chrome.runtime.getURL('sidebar.html');
    sidebarIframe.style.width = '300px';
    sidebarIframe.style.height = '100vh';
    sidebarIframe.style.position = 'fixed';
    sidebarIframe.style.right = '0';
    sidebarIframe.style.top = '0';
    sidebarIframe.style.zIndex = '1000';
    sidebarIframe.style.border = 'none';
    sidebarIframe.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.5)';
    document.body.appendChild(sidebarIframe);

    sidebarIframe.onload = () => {
        sidebarIframe.contentWindow.postMessage({ type: 'loadHistory', history: conversationHistory }, '*');
    };
}

function toggleSidebar() {
    if (sidebarVisible) {
        if (sidebarIframe) {
            sidebarIframe.remove();
            sidebarIframe = null;
        }
        sidebarVisible = false;
    } else {
        createSidebar();
        sidebarVisible = true;
    }
}

document.addEventListener('keydown', (event) => {
    if (event.metaKey && event.key === 'p') {
        event.preventDefault();
        toggleSidebar();
    }
});




window.addEventListener('message', (event) => {
    if (event.data.type === 'clearHistory') {
        conversationHistory = []; // Reset conversation history
    } else if (sidebarIframe && event.source === sidebarIframe.contentWindow) {
        const message = event.data;
        if (message.type === 'userMessage') {
            const selectedModel = message.model;
            const userMessage = message.text;
            conversationHistory.push({ role: 'user', content: userMessage });

            const key = window._env_.API_KEY;
            // Send the conversation history to the AI API and receive the response
            fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + key,
                },
                body: JSON.stringify({
                    "model": selectedModel,
                    "messages": conversationHistory,
                    "temperature": 0.7
                }),
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Success:', data);
                    const assistantMessage = data.choices[0].message.content.trim();
                    conversationHistory.push({ role: 'assistant', content: assistantMessage });
                    sidebarIframe.contentWindow.postMessage({ type: 'assistantMessage', text: assistantMessage }, '*');
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        }
    }
});
