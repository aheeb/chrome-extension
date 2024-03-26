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
        chrome.storage.local.get('conversationHistory', function (data) {
            if (data.conversationHistory) {
                conversationHistory = data.conversationHistory;
                sidebarIframe.contentWindow.postMessage({ type: 'loadHistory', history: conversationHistory }, '*');
            }
        });
        // Notify the iframe that it has been loaded
        sidebarIframe.contentWindow.postMessage({ type: 'iframeLoaded' }, '*');

        // Send any other necessary messages, like loading conversation history
        sidebarIframe.contentWindow.postMessage({ type: 'loadHistory', history: conversationHistory }, '*');
    };

    document.body.appendChild(sidebarIframe);

}

function handleInternalLinks(iframe) {
    const links = iframe.contentDocument.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const target = event.target.getAttribute('href');
            iframe.src = chrome.runtime.getURL(target);
        });
    });
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
            const key = message.API_KEY;
            const userMessage = message.text;
            console.log(selectedModel);
            conversationHistory.push({ role: 'user', content: userMessage });
            console.log(conversationHistory);
            // Send the conversation history to the AI API and receive the response
            fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`,
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
                    chrome.storage.local.set({ 'conversationHistory': conversationHistory });
                    sidebarIframe.contentWindow.postMessage({ type: 'assistantMessage', text: assistantMessage }, '*');
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        }
    }
});
