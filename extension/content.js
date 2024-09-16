(async function () {
    if (document.readyState !== 'complete') {
        await new Promise((resolve) => window.addEventListener('load', resolve));
    }

    console.log('CVS Scraper Extension: Starting processing...');

    await scrapeCvsPromotions();

    async function scrapeCvsPromotions() {
        try {
            await waitForElement('div.css-1dbjc4n.r-18u37iz.r-tzz3ar', 10000);
            
            const products = document.querySelectorAll('div.css-1dbjc4n.r-18u37iz.r-tzz3ar');
            console.log(`Found ${products.length} products on the page.`);
            let product = products[0];  // For demo purposes, processing one product at a time

            try {
                const title = extractTitle(product);
                const imageUrl = extractImageUrl(product);
                const price = extractPrice(product);
                const productUrl = extractProductUrl(product);
                const promotionText = extractPromotionText(product);

                console.log(`Product: ${title}\nPrice: ${price}\nImage URL: ${imageUrl}\nProduct URL: ${productUrl}\nPromotion: ${promotionText}`);
                
                const cvsProduct = {
                    title: title,
                    price: price,
                    image_urls: [imageUrl],
                    product_url: productUrl,
                    source: 'cvs',
                    promotionText: promotionText  // Adding the promotion text
                };

                // Send a message to the background script to search Amazon
                const amazonResults = await searchAmazon(cvsProduct);
                console.log('Amazon Results:', amazonResults);

                // Call the API endpoint to process the product with CVS and Amazon data
                const apiResponse = await processProduct(cvsProduct, amazonResults);
                console.log('API Response:', apiResponse);

                console.log('----------');
            } catch (err) {
                console.error('Error processing the product:', err);
            }
        } catch (err) {
            console.error('Error scraping CVS:', err);
        }
    }

    async function searchAmazon(product) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: 'searchAmazon', product },
                (response) => {
                    if (response && response.error) {
                        reject(response.error);
                    } else if (response && response.results) {
                        resolve(response.results);
                    } else {
                        reject('No response from background script.');
                    }
                }
            );
        });
    }

    async function processProduct(cvsProduct, amazonResults) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: 'processProduct', cvsProduct, amazonResults },
                (response) => {
                    if (response && response.error) {
                        reject(response.error);
                    } else if (response && response.data) {
                        resolve(response.data);
                    } else {
                        reject('No response from background script.');
                    }
                }
            );
        });
    }

    // Helper functions for extracting product details
    function waitForElement(selector, timeout) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const interval = setInterval(() => {
                if (document.querySelector(selector)) {
                    clearInterval(interval);
                    resolve();
                } else if (Date.now() - start > timeout) {
                    clearInterval(interval);
                    reject(new Error('Element not found: ' + selector));
                }
            }, 100);
        });
    }

    function extractTitle(productElement) {
        const titleDiv = productElement.querySelector('div.css-901oao.css-cens5h.r-b0vftf.r-1xaesmv.r-ubezar.r-majxgm.r-29m4ib.r-rjixqe.r-1bymd8e.r-fdjqy7.r-13qz1uu');
        return titleDiv ? titleDiv.textContent.trim() : 'No title found';
    }

    function extractImageUrl(productElement) {
        const imgTag = productElement.querySelector('img.PLP-tile-image');
        let imageUrl = imgTag ? imgTag.src : '';
        if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
        }
        return imageUrl;
    }

    function extractPrice(productElement) {
        const priceDiv = productElement.querySelector('div.css-901oao[aria-label*="Price"]');
        return priceDiv ? priceDiv.textContent.trim() : 'No price found';
    }

    function extractProductUrl(productElement) {
        const productLinkTag = productElement.querySelector('a[href]');
        return productLinkTag ? 'https://www.cvs.com' + productLinkTag.getAttribute('href') : 'No URL found';
    }

    function extractPromotionText(productElement) {
        const promotionDiv = productElement.querySelector('div.css-901oao.r-cme181.r-1jn44m2.r-1b43r93.r-14yzgew.r-knv0ih');
        return promotionDiv ? promotionDiv.textContent.trim() : 'No promotion found';
    }
    
})();
