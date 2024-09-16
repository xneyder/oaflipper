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

                console.log(`Product: ${title}\nPrice: ${price}\nImage URL: ${imageUrl}\nProduct URL: ${productUrl}`);
                
                const cvsProduct = {
                    title: title,
                    price: price,
                    image_urls: [imageUrl],
                    product_url: productUrl,
                    source: 'cvs'
                };

                // Get the bounding rect for cropping the screenshot from the specific selector
                const targetElement = document.querySelector('#root > div > div > div > div.css-1dbjc4n.r-13awgt0.r-1mlwlqe.r-1wgg2b2.r-13qz1uu > div > div:nth-child(1) > div > div > div > main > div > div > div.css-1dbjc4n.r-n2h5ot.r-bnwqim.r-13qz1uu > div > div > div > div.css-1dbjc4n.r-13awgt0.r-1mlwlqe > div > div > div > div:nth-child(2) > div > div > div:nth-child(1)');
                if (!targetElement) {
                    throw new Error('Target element for screenshot not found');
                }
                const rect = targetElement.getBoundingClientRect();
                const screenshot = await captureScreenshotAndCrop(rect);
                console.log(`Captured and cropped screenshot for product: ${title}`);

                // Add the screenshot to the cvsProduct object
                cvsProduct.screenshot = screenshot;

                // Send a message to the background script to search Amazon
                const amazonResults = await searchAmazon(cvsProduct);
                console.log('Amazon Results:', amazonResults);

                // Call the API endpoint to process the product with CVS and Amazon screenshots
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

    async function processProduct(cvsProduct, amazonResults, screenshot) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: 'processProduct', cvsProduct, amazonResults, screenshot },
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

    // Capture the screenshot and crop it based on the product element's bounding rect
    async function captureScreenshotAndCrop(rect) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: 'captureScreenshot' },
                (response) => {
                    if (response && response.screenshot) {
                        const croppedScreenshot = cropScreenshot(response.screenshot, rect);
                        resolve(croppedScreenshot);
                    } else {
                        reject('Failed to capture screenshot.');
                    }
                }
            );
        });
    }

    // Function to crop the screenshot based on the bounding rect
    function cropScreenshot(dataUrl, rect) {
        return new Promise((resolve) => {
            const image = new Image();
            image.src = dataUrl;

            image.onload = () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                canvas.width = rect.width;
                canvas.height = rect.height;

                context.drawImage(
                    image,
                    rect.left, rect.top, rect.width, rect.height,
                    0, 0, rect.width, rect.height
                );

                resolve(canvas.toDataURL('image/png'));
            };
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
})();
