document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.getElementById('playButton');
  const loginButton = document.getElementById('loginButton');
  const statusDiv = document.getElementById('status');

  // Check authentication status
  fetch('http://localhost:3000/api/auth/check-auth', {
    method: 'GET',
    credentials: 'include' // Include cookies if necessary
  })
    .then(response => response.json())
    .then(data => {
      if (data.authenticated) {
        // User is authenticated, show the Play button
        playButton.style.display = 'block';
      } else {
        // User is not authenticated, show the Login button
        loginButton.style.display = 'block';
      }
    })
    .catch(error => {
      console.error('Error checking authentication:', error);
      statusDiv.innerText = 'Error checking authentication.';
    });

  // Handle Play button click
  playButton.addEventListener('click', () => {
    // Send a message to the content script to start processing
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          files: ['content.js']
        },
        () => {
          // Execution complete
          statusDiv.innerText = 'Processing...';
        }
      );
    });
  });

  // Handle Login button click
  loginButton.addEventListener('click', () => {
    // Open a new tab to the sign-in page
    chrome.tabs.create({ url: 'http://localhost:3000/signin' });
  });
});
