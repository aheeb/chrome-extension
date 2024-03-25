// content_script.js
document.addEventListener('mouseup', function () {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        chrome.runtime.sendMessage({ type: 'textSelected', text: selectedText });
    }
});
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'getPageContent') {
        sendResponse({ content: document.body.innerText });
    }
});