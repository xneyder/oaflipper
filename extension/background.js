chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'searchAmp') {
        const productTitle = message.product.title;

        // Open a new tab in Chrome to search SellerAmp
        chrome.tabs.create({ url: 'https://sas.selleramp.com/', active: true }, function (tab) {
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
    }
});

// Helper function for sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to inject the content script with retry mechanism
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
                    console.log(result);
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
                        chrome.tabs.update(tabId, { active: true }, () => {
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
                                        } else {
                                            console.error('No result returned after extraction.');
                                            sendResponse({ error: 'No result returned after extraction.' });
                                        }
                                    }
                                );
                            });
                        });
                    } else {
                        console.error('No result returned from the content script');
                        sendResponse({ error: 'No result returned from the content script' });
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

        // Wait for 5 seconds to allow results to load (adjust based on timing)
        await sleep(5000);

        // Extract results after the page loads
        const results = extractSellerAmpResults();

        return results;

    } catch (error) {
        console.error('Error performing SellerAmp search:', error);
        return [];
    }
}

// Helper function to extract SellerAmp results after the page loads
function extractSellerAmpResults() {
    console.log('Extracting results...');

    const results = document.querySelectorAll('li .pl-item-container');
    const sellerAmpResults = [];

    if (results.length === 0) {
        console.error('No search results found on the page');
        return [];
    }

    results.forEach(result => {
        let asin, upc, buyBox, bsr, maxCost, offers, title, imageUrl;

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

            // Extracting Offers (FBA, FBM)
            let fbaOffers = result.querySelector('.fba-offer-cnt')?.textContent.trim() || 'FBA not found';
            let fbmOffers = result.querySelector('.fbm-offer-cnt')?.textContent.trim() || 'FBM not found';
            offers = `FBA: ${fbaOffers}, FBM: ${fbmOffers}`;

            // Extracting Image URL
            imageUrl = result.querySelector('img.pl-image')?.src || 'Image not found';

        } catch (e) {
            console.error('Error extracting data from search result', e);
            return;
        }

        // Add the extracted data to the results array
        sellerAmpResults.push({
            asin: asin,
            title: title,
            upc: upc,
            buyBox: buyBox,
            bsr: bsr,
            maxCost: maxCost,
            offers: offers,
            imageUrl: imageUrl
        });
    });

    if (sellerAmpResults.length > 0) {
        console.log('Extracted SellerAmp search results:', sellerAmpResults);
    } else {
        console.error('No valid products found');
    }

    return sellerAmpResults.length > 0 ? sellerAmpResults : [{ title: 'No results', price: 'N/A', url: 'N/A' }];
}
