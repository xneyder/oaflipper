chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fetchFees') {
        const asin = message.asin;
    
        chrome.tabs.create({ url: 'https://sas.selleramp.com/', active: false }, function (tab) {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    console.log(`Tab ${tabId} is fully loaded. Searching for ASIN: ${asin}`);
    
                    // Inject search logic to input ASIN and fetch fees
                    chrome.scripting.executeScript(
                        {
                            target: { tabId: tabId, allFrames: false },
                            func: (asin) => {
                                const searchInput = document.getElementById('saslookup-search_term');
                                const submitButton = document.querySelector('button[type="submit"]');
    
                                if (searchInput && submitButton) {
                                    searchInput.value = asin;
                                    submitButton.click();
                                }
    
                                return 'Search triggered';
                            },
                            args: [asin]
                        },
                        async (results) => {
                            if (chrome.runtime.lastError) {
                                console.error(`Error fetching fees: ${chrome.runtime.lastError.message}`);
                                sendResponse({ error: `Failed to fetch fees for ASIN: ${asin}` });
                            } else {
                                console.log(`Search triggered for ASIN ${asin}. Waiting 5 seconds for results to load...`);
    
                                // Add a 5-second sleep after the ASIN search is triggered
                                await new Promise(resolve => setTimeout(resolve, 3000));
    
                                // Inject script to extract the fees after waiting
                                chrome.scripting.executeScript(
                                    {
                                        target: { tabId: tabId, allFrames: false },
                                        func: () => {
                                            return new Promise((resolve) => {
                                                const observer = new MutationObserver((mutationsList, observer) => {
                                                    const feeElement = document.querySelector('#saslookup-total_fee');
                                                    if (feeElement) {
                                                        observer.disconnect();
                                                        resolve(feeElement.textContent.trim());
                                                    }
                                                });
    
                                                observer.observe(document.body, { childList: true, subtree: true });
                                            });
                                        }
                                    },
                                    (results) => {
                                        if (chrome.runtime.lastError) {
                                            console.error(`Error fetching fees: ${chrome.runtime.lastError.message}`);
                                            sendResponse({ error: `Failed to fetch fees for ASIN: ${asin}` });
                                        } else {
                                            const fees = results[0]?.result || 'Fees not found';
                                            console.log(`Fees for ASIN ${asin}: ${fees}`);
    
                                            // Close the tab after fetching the fees
                                            chrome.tabs.remove(tabId, () => {
                                                console.log(`Tab ${tabId} closed successfully.`);
                                                sendResponse({ fees });
                                            });
                                        }
                                    }
                                );
                            }
                        }
                    );
    
                    // Remove listener after tab is updated and script executed
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            });
        });
    
        // Return true to indicate async response
        return true;
    }
     else if (message.action === 'searchAmp') {
        const productTitle = message.product.title;
        
        // Open a new tab in Chrome to search SellerAmp
        chrome.tabs.create({ url: 'https://sas.selleramp.com/', active: false }, function (tab) {
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
        const { parsedProduct, amazonResults } = message;
        // Use async function to handle the message
        (async () => {
            try {
                const response = await fetch('http://localhost:3000/api/product/processProduct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Include cookies if necessary for authentication
                    body: JSON.stringify({ product: parsedProduct, amazon_results: amazonResults })
                });

                console.log('Processing product:', parsedProduct, amazonResults);
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
    } else if (message.action === 'openProductTabForImage') {
        const { productUrl } = message;
        let attempts = 0;
        const maxAttempts = 3;

        function tryScrapeProductImage(tab) {
            const timeoutDuration = 5000; // 5 seconds
            let timeoutId;

            // Listener function for when the tab is updated
            const listener = (tabId, changeInfo) => {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    console.log(`Tab ${tabId} is fully loaded for product: ${productUrl}`);

                    // Clear the timeout because the page has loaded within the allowed time
                    clearTimeout(timeoutId);

                    // Inject script to get the image URL from the newly opened tab
                    chrome.scripting.executeScript(
                        {
                            target: { tabId: tabId, allFrames: false },
                            func: scrapeProductImage, // This function will return only the image
                        },
                        (result) => {
                            if (chrome.runtime.lastError) {
                                console.error(`Error injecting script: ${chrome.runtime.lastError.message}`);
                                sendResponse({ error: chrome.runtime.lastError.message });
                            } else if (result[0]?.result) {
                                console.log('Scraped product image:', result[0].result);

                                // Close the tab after scraping the image
                                chrome.tabs.remove(tabId, () => {
                                    console.log(`Closed tab ${tabId}`);
                                    sendResponse({ imageUrl: result[0].result });
                                });
                            } else {
                                console.error('Failed to scrape product image');
                                sendResponse({ error: 'Failed to scrape product image' });
                            }
                        }
                    );

                    // Remove listener after the tab is fully loaded and the script is injected
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            };

            // Set up a timeout that will refresh the tab if it doesn't load within 5 seconds
            timeoutId = setTimeout(() => {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log(`Page load timeout. Retrying (${attempts}/${maxAttempts})...`);
                    chrome.tabs.reload(tab.id); // Refresh the tab
                } else {
                    console.error('Max attempts reached. Failed to scrape product image.');
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.remove(tab.id, () => {
                        console.log(`Closed tab ${tab.id} after max retries.`);
                        sendResponse({ error: 'Failed to scrape product image after multiple attempts' });
                    });
                }
            }, timeoutDuration);

            // Add the listener for the tab update event
            chrome.tabs.onUpdated.addListener(listener);
        }

        // Open product in a new tab to scrape the image
        chrome.tabs.create({ url: productUrl, active: false }, function (tab) {
            tryScrapeProductImage(tab); // Start the image scraping attempt
        });

        // Return true to indicate the response will be sent asynchronously
        return true;
    }
});

// Helper function for sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to inject the content script with retry mechanism for SellerAmp
async function injectScriptWithRetry(tabId, productTitle, sendResponse, attempt) {
    const maxAttempts = 3;
    const retryDelay = 2000; // 2 seconds
    
    chrome.tabs.get(tabId, function (tab) {
        if (chrome.runtime.lastError || !tab) {
            console.error(`Error getting tab or tab is closed: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Tab not found'}`);
            sendResponse({ error: 'Tab not found or has been closed' });
            return;
        }
        
        sleep(1000).then(() => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId, allFrames: false },  // Inject into the top frame
                    func: performSellerAmpSearch,
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
                        console.log('SellerAmp search returned results:', result[0].result);
                        
                        // Sleep for 5 seconds before switching back to tab
                        await sleep(5000);
                        
                        // Switch back to tab and extract results
                        chrome.tabs.update(tabId, { active: false }, () => {
                            sleep(3000).then(() => {
                                chrome.scripting.executeScript(
                                    {
                                        target: { tabId: tabId }, // Ensure the main frame or valid frame is selected
                                        func: extractSellerAmpResults, // Now extract results
                                        args: []
                                    },
                                    (result) => {
                                        if (chrome.runtime.lastError) {
                                            console.error(`Error extracting script: ${chrome.runtime.lastError.message}`);
                                            sendResponse({ error: 'Failed to extract results' });
                                        } else if (result[0]?.result) {
                                            console.log('Results extracted successfully.');
                                            sendResponse({ results: result[0].result });
                                            // Close the tab after scraping
                                            chrome.tabs.remove(tabId, () => {
                                                console.log(`Tab ${tabId} closed successfully.`);
                                            });
                                        } else {
                                            console.error('No result returned after extraction.');
                                            sendResponse({ error: 'No result returned after extraction.' });
                                        }
                                    }
                                );
                            });
                        });
                    } else {
                        console.error('No result returned from the content script, retrying with Load More click');
                        await sleep(5000);  // Wait for new results to load
                        injectScriptWithRetry(tabId, productTitle, sendResponse, attempt + 1); // Retry injection
                    }
                }
            );
        });
    });
}

// Function to perform a search on SellerAmp and return results
async function performSellerAmpSearch(title) {
    console.log(`Performing SellerAmp search for: ${title}`);
    
    try {
        // Directly query the search input and submit button
        const searchInput = document.getElementById('saslookup-search_term');
        const submitButton = document.querySelector('button[type="submit"]');
        
        if (!searchInput || !submitButton) {
            console.error('Search input or submit button not found');
            return [];
        }
        
        // Set the search term and submit the form
        searchInput.value = title;
        submitButton.click();
        
        console.log('Search submitted, waiting for results to load...');
        
        // Return empty results initially to force retry
        return [];
        
    } catch (error) {
        console.error('Error performing SellerAmp search:', error);
        return [];
    }
}

// Function to extract results from SellerAmp after search, including fetching fees for each product ASIN
async function extractSellerAmpResults() {
    console.log('Extracting results...');

    // Helper function for sleep
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Function to open a new tab, search for the ASIN, extract fees, and close the tab
    async function fetchFeesForASIN(asin) {
        return new Promise((resolve, reject) => {
            // chrome.tabs.create needs to be used in the background or popup script, not in content scripts
            chrome.runtime.sendMessage({ action: 'fetchFees', asin: asin }, (response) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response.fees);
                }
            });
        });
    }

    const loadMoreButton = document.querySelector('#productList-loadmore > a');

    if (loadMoreButton) {
        console.log('Found Load More button, triggering click...');
        loadMoreButton.click();
    } else {
        console.log('Load More button not found, retrying...');
    }

    // Wait for new results to load
    await sleep(3000); // Now using await to ensure the function pauses correctly

    const results = document.querySelectorAll('li .pl-item-container');
    const sellerAmpResults = [];

    if (results.length === 0) {
        console.error('No search results found on the page');
        return [];
    }

    for (const result of results) {
        let asin, upc, buyBox, bsr, maxCost, offers, title, imageUrl, fees;

        try {
            // Extracting ASIN
            asin = result.getAttribute('asin') || 'ASIN not found';

            // Extracting Title
            title = result.querySelector('.productList-title')?.textContent.trim() || 'Title not found';

            // Extracting UPC
            upc = result.querySelector('.pl-upc-input')?.value.trim() || 'UPC not found';

            // Extracting Buy Box Price
            buyBox = result.querySelector('.qi-buy-box')?.textContent.trim() || 'Buy Box not found';

            // Extracting Best Sellers Rank (BSR)
            bsr = result.querySelector('.qi-bsr-pnl .productList-bsr')?.textContent.trim() || 'BSR not found';

            // Extracting Max Cost
            maxCost = result.querySelector('.qi-max-cost')?.textContent.trim() || 'Max Cost not found';

            // Extracting Offers (AMZ, FBA, FBM)
            let amzOffer = result.querySelector('.amz-on-listing') ? 'AMZ: 1' : 'AMZ: 0';
            let fbaOffers = result.querySelector('.fba-offer-cnt')?.textContent.trim() || 'FBA not found';
            let fbmOffers = result.querySelector('.fbm-offer-cnt')?.textContent.trim() || 'FBM not found';

            // Concatenating the offers
            offers = `${amzOffer}, FBA: ${fbaOffers}, FBM: ${fbmOffers}`;

            // Extracting Image URL
            imageUrl = result.querySelector('img.pl-image')?.src || 'Image not found';

            // Fetch fees for ASIN by sending a message to the background script
            fees = await fetchFeesForASIN(asin);
            console.log(`Fees for ASIN ${asin}: ${fees}`);

        } catch (e) {
            console.error('Error extracting data from search result', e);
            return;
        }

        // Add the extracted data to the results array
        sellerAmpResults.push({
            asin: asin,
            title: title,
            price: buyBox,
            image_url: imageUrl,
            product_url: `https://www.amazon.com/dp/${asin}`,
            upc: upc,
            bsr: bsr,
            max_cost: maxCost,
            offers: offers,
            fees: fees
        });
    }

    if (sellerAmpResults.length > 0) {
        console.log('Extracted SellerAmp search results:', sellerAmpResults);
    } else {
        console.error('No valid products found');
    }

    return sellerAmpResults.length > 0 ? sellerAmpResults : [{ title: 'No results', price: 'N/A', url: 'N/A', fees: 'N/A' }];
}



// Function to scrape product image from a new tab for Walgreens
function scrapeProductImage() {
    const imageUrl = document.querySelector('#productImg')?.src || 'No image URL found';
    return imageUrl;
}
