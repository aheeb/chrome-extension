let sidebarTabId = null;

// Listener for the keyboard shortcut
chrome.commands.onCommand.addListener(function (command) {
    if (command === "_execute_sidebar_action") {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            sidebarTabId = tabs[0].id;
            toggleSidebar(tabs[0]);
        });
    }
});

// Function to toggle the sidebar
function toggleSidebar(tab) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['sidebar.js']
    });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'textSelected' && sidebarTabId !== null) {
        chrome.tabs.sendMessage(sidebarTabId, request);
    }
});
