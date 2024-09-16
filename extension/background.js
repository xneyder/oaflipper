// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'searchAmazon') {
        const productTitle = message.product.title;

        // Open a new tab in Chrome to search Amazon
        chrome.tabs.create({ url: 'https://www.amazon.com', active: true }, function (tab) {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    console.log(`Tab ${tabId} is fully loaded. Injecting content script.`);

                    injectScriptWithRetry(tabId, productTitle, sendResponse, 0);  // Retry mechanism added

                    // Remove the listener once the tab is updated and script executed
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            });
        });

        // Return true to indicate we will send a response asynchronously
        return true;
    } else if (message.action === 'processProduct') {
        const { cvsProduct, amazonResults } = message;
        // Use async function to handle the message
        (async () => {
            try {
                const response = await fetch('http://localhost:3000/api/product/processProduct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Include cookies if necessary for authentication
                    body: JSON.stringify({ product: cvsProduct, amazon_results: amazonResults })
                });

                console.log('Processing product:', cvsProduct, amazonResults);
                const data = await response.json();

                console.log('API response:', data);
                sendResponse({ data }); // Send the API response back to the content script
            } catch (error) {
                console.error('Error calling API:', error);
                sendResponse({ error: error.message });
            }
        })();

        // Return true to indicate that the response is asynchronous
        return true;
    } else if (message.action === 'closeCurrentTab') {
        console.log("Closing tab with ID:", sender.tab.id);
        chrome.tabs.remove(sender.tab.id);
    }
});

// Helper function for sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to inject the content script with retry mechanism and a delay before injecting
async function injectScriptWithRetry(tabId, productTitle, sendResponse, attempt) {
    const maxAttempts = 3;
    const retryDelay = 2000; // 2 seconds

    // Check if the tab is still valid
    chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError || !tab) {
            console.error(`Error getting tab or tab is closed: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Tab not found'}`);
            sendResponse({ error: 'Tab not found or has been closed' });
            return;
        }

        // Adding a sleep to wait for the page to stabilize before injection
        sleep(3000).then(() => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId, allFrames: false },  // Inject into the top frame
                    func: performAmazonSearch,
                    args: [productTitle]
                },
                async (result) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error injecting script: ${chrome.runtime.lastError.message}`);

                        if (attempt < maxAttempts) {
                            console.log(`Retrying injection... Attempt ${attempt + 1}/${maxAttempts}`);
                            setTimeout(() => injectScriptWithRetry(tabId, productTitle, sendResponse, attempt + 1), retryDelay);
                        } else {
                            console.error('Max retry attempts reached. Aborting script injection.');
                            sendResponse({ error: 'Failed to inject script after multiple attempts' });
                        }
                        return;
                    }

                    // Check if result is valid
                    if (result && result[0] && result[0].result) {
                        console.log('Amazon search returned results:', result[0].result);

                        // Adding another sleep before injecting the scroll and close function
                        await sleep(2000); // Wait 2 seconds before injecting the scroll and close function

                        // Inject the scroll and close function and wait for it to complete before sending the response
                        chrome.scripting.executeScript(
                            {
                                target: { tabId: tabId }, // Ensure the main frame or valid frame is selected
                                func: scrollAndCloseTab,
                                args: []
                            },
                            () => {
                                if (chrome.runtime.lastError) {
                                    console.error(`Error injecting scroll script: ${chrome.runtime.lastError.message}`);

                                    if (attempt < maxAttempts) {
                                        console.log(`Retrying scroll injection... Attempt ${attempt + 1}/${maxAttempts}`);
                                        setTimeout(() => injectScriptWithRetry(tabId, productTitle, sendResponse, attempt + 1), retryDelay);
                                    } else {
                                        console.error('Max retry attempts reached. Aborting scroll injection.');
                                        sendResponse({ error: 'Failed to inject scroll script after multiple attempts' });
                                    }
                                } else {
                                    console.log("Scroll and close script executed successfully.");
                                    sendResponse({ results: result[0].result });
                                }
                            }
                        );
                    } else {
                        console.error('No result returned from the content script');
                        sendResponse({ error: 'No result returned from the content script' });
                    }
                }
            );
        });
    });
}

// function extractAsin(url) {
//     console.log("Extracting ASIN from URL:", url); // Log the URL you're extracting from

//     // Try to extract ASIN directly from the URL path
//     const asinMatch = url.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
//     if (asinMatch) {
//         console.log("ASIN found in URL path:", asinMatch[1]);
//         return asinMatch[1]; // Return the ASIN if found
//     }

//     // If no match, check if ASIN is inside query parameters (e.g., redirect links)
//     try {
//         const urlObj = new URL(url);
//         const queryParams = new URLSearchParams(urlObj.search);

//         if (queryParams.has('url')) {
//             const decodedUrl = decodeURIComponent(queryParams.get('url'));
//             console.log("Decoded URL from query params:", decodedUrl);
//             const asinFromQuery = decodedUrl.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
//             if (asinFromQuery) {
//                 console.log("ASIN found in decoded query params:", asinFromQuery[1]);
//                 return asinFromQuery[1]; // Return the ASIN from query string
//             }
//         }
//     } catch (error) {
//         console.error("Error parsing URL:", error); // Log parsing errors
//     }

//     console.log("ASIN not found for URL:", url);
//     return null; // Return null if ASIN could not be extracted
// }

function performAmazonSearch(title) {
    return new Promise((resolve) => {
        console.log(`Performing Amazon search for: ${title}`);

        // Check if the search bar exists
        const searchBar = document.getElementById('twotabsearchtextbox');
        if (!searchBar) {
            console.error('Search bar not found');
            resolve([]);
            return;
        }

        // Perform the search
        searchBar.value = title;
        searchBar.form.submit();

        console.log('Search submitted, waiting for results to load...');

        // Helper function to extract results
        function extractAmazonResults() {
            const results = document.querySelectorAll('.s-main-slot .s-result-item');
            const amazonResults = [];

            if (results.length === 0) {
                console.error('No search results found on the page');
                return [];
            }

            for (let i = 0; i < Math.min(10, results.length); i++) {
                const result = results[i];
                let productUrl, productTitle, imageUrl, productPrice, asin;

                try {
                    productUrl = result.querySelector('a.a-link-normal.s-no-outline')?.href ||
                        result.querySelector('a.a-link-normal')?.href;
                    productTitle = result.querySelector('span.a-size-base-plus.a-color-base.a-text-normal')?.textContent ||
                        result.querySelector('span.a-text-normal')?.textContent;
                    imageUrl = result.querySelector('img.s-image')?.src;

                    // Extract the price
                    productPrice = result.querySelector('span.a-price span.a-offscreen')?.textContent;

                    // Inline ASIN extraction logic
                    console.log("Extracting ASIN from URL:", productUrl);
                    try {
                        const urlObj = new URL(productUrl);
                        const asinMatch = urlObj.pathname.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
                        if (asinMatch) {
                            asin = asinMatch[1];
                            console.log("ASIN found in URL path:", asin);
                        } else {
                            // If ASIN is in query parameters
                            const queryParams = new URLSearchParams(urlObj.search);
                            if (queryParams.has('url')) {
                                const decodedUrl = decodeURIComponent(queryParams.get('url'));
                                const asinFromQuery = decodedUrl.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
                                if (asinFromQuery) {
                                    asin = asinFromQuery[1];
                                    console.log("ASIN found in decoded query params:", asin);
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error parsing or extracting ASIN from URL:", error);
                    }

                } catch (e) {
                    console.error('Error extracting data from search result', e);
                    continue;
                }

                if (productUrl && productTitle) {
                    amazonResults.push({
                        url: productUrl,
                        title: productTitle,
                        image_url: imageUrl || null,
                        price: productPrice || 'Price not available',
                        asin: asin || 'ASIN not available'
                    });
                }
            }

            if (amazonResults.length > 0) {
                console.log('Extracted Amazon search results:', amazonResults);
            } else {
                console.error('No valid products found');
            }

            return amazonResults;
        }

        // Wait for search results to load
        const observer = new MutationObserver(() => {
            console.log('MutationObserver detected changes in DOM');
            const amazonResults = extractAmazonResults();
            if (amazonResults.length > 0) {
                observer.disconnect();
                resolve(amazonResults);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Fallback in case MutationObserver does not fire
        setTimeout(() => {
            console.log('Fallback triggered after waiting 5 seconds');
            const amazonResults = extractAmazonResults();
            observer.disconnect(); // Ensure observer disconnects even if fallback is used
            resolve(amazonResults);
        }, 5000); // Wait for 5 seconds before using the fallback
    });
}


// Function to scroll and close the tab with a random delay
function scrollAndCloseTab() {
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function scrollPageAndClose() {
        console.log("Scrolling the page to simulate human interaction...");

        // Scroll down a few times
        window.scrollBy(0, 300); // Scroll down a bit
        console.log("Scrolled by 300px");
        await sleep(1000); // Wait 1 second

        window.scrollBy(0, 600); // Scroll down further
        console.log("Scrolled by 600px");
        await sleep(1000); // Wait another second

        window.scrollBy(0, 900); // Scroll down further
        console.log("Scrolled by 900px");

        // Wait for a random time between 1 and 5 seconds
        const randomDelay = getRandomInt(1000, 5000);
        console.log(`Waiting for ${randomDelay} milliseconds before closing the tab...`);
        await sleep(randomDelay);

        console.log("Closing the tab...");
        chrome.runtime.sendMessage({ action: 'closeCurrentTab' });
    }

    scrollPageAndClose();
}
