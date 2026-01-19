/**
 * SignalsLoop Visual Editor Extension
 * Popup Script
 */

const toggle = document.getElementById('toggle');

// Get current status
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response?.enabled) {
        toggle.classList.add('active');
    } else {
        toggle.classList.remove('active');
    }
});

// Handle toggle click
toggle.addEventListener('click', () => {
    const isActive = toggle.classList.contains('active');
    const newState = !isActive;

    // Update UI immediately
    if (newState) {
        toggle.classList.add('active');
    } else {
        toggle.classList.remove('active');
    }

    // Send message to background
    chrome.runtime.sendMessage({
        type: 'SET_STATUS',
        enabled: newState
    });
});
