(async function () {
    if (document.readyState !== 'complete') {
        await new Promise((resolve) => window.addEventListener('load', resolve));
    }

    console.log('Scraper Extension: Starting processing...');

    // Check if the URL is CVS or Walgreens and call the appropriate function
    if (window.location.href.includes('cvs.com')) {
        console.log('Detected CVS website');
        await scrapeCvsPromotions();
    } else if (window.location.href.includes('walgreens.com')) {
        console.log('Detected Walgreens website');
        await scrapeWalgreensPromotions();
    } else {
        console.log('This script only works on CVS or Walgreens websites.');
    }

    async function scrapeCvsPromotions() {
        try {
            await waitForElement('div.css-1dbjc4n.r-18u37iz.r-tzz3ar', 10000);

            const products = document.querySelectorAll('div.css-1dbjc4n.r-18u37iz.r-tzz3ar');
            console.log(`Found ${products.length} products on CVS page.`);

            for (const product of products) {
                try {
                    const title = extractTitle(product);
                    const imageUrl = extractImageUrl(product);
                    const price = extractPrice(product);
                    const productUrl = extractProductUrl(product);
                    const promotionText = extractPromotionText(product);

                    console.log(`Product: ${title}\nPrice: ${price}\nImage URL: ${imageUrl}\nProduct URL: ${productUrl}\nPromotion: ${promotionText}`);

                    const parsedProduct = {
                        title: title,
                        price: price,
                        image_urls: [imageUrl],
                        product_url: productUrl,
                        source: 'cvs',
                        promotionText: promotionText
                    };

                    const amazonResults = await searchAmazon(parsedProduct);
                    console.log('Amazon Results:', amazonResults);

                    const apiResponse = await processProduct(parsedProduct, amazonResults);
                    console.log('API Response:', apiResponse);

                    console.log('----------');
                } catch (err) {
                    console.error('Error processing CVS product:', err);
                }
            }
        } catch (err) {
            console.error('Error scraping CVS:', err);
        }
    }

    async function scrapeWalgreensPromotions() {
        try {
            await waitForElement('div.owned-brands__container', 10000);

            const products = document.querySelectorAll('div.owned-brands__container');
            console.log(`Found ${products.length} products on Walgreens page.`);

            let product = products[0];
            // for (const product of products) {
                try {
                    const title = extractWalgreensTitle(product);
                    const imageUrl = extractWalgreensImageUrl(product);
                    const price = extractWalgreensPrice(product);
                    const productUrl = extractWalgreensProductUrl(product);
                    const promotionText = extractWalgreensPromotionText(product);

                    console.log(`Product: ${title}\nPrice: ${price}\nImage URL: ${imageUrl}\nProduct URL: ${productUrl}\nPromotion: ${promotionText}`);

                    const parsedProduct = {
                        title: title,
                        price: price,
                        image_urls: [imageUrl],
                        product_url: productUrl,
                        source: 'walgreens',
                        promotionText: promotionText
                    };

                    const amazonResults = await searchAmazon(parsedProduct);
                    console.log('Amazon Results:', amazonResults);

                    const apiResponse = await processProduct(parsedProduct, amazonResults);
                    console.log('API Response:', apiResponse);

                    console.log('----------');
                } catch (err) {
                    console.error('Error processing Walgreens product:', err);
                }
            // }
        } catch (err) {
            console.error('Error scraping Walgreens:', err);
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

    async function processProduct(parsedProduct, amazonResults) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: 'processProduct', parsedProduct, amazonResults },
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

    // Helper functions for CVS

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

    // Helper functions for Walgreens

    function extractWalgreensTitle(productElement) {
        const titleElement = productElement.querySelector('strong.description');
        return titleElement ? titleElement.textContent.trim() : 'No title found';
    }

    function extractWalgreensImageUrl(productElement) {
        const imgTag = productElement.querySelector('img');
        let imageUrl = imgTag ? imgTag.src : '';
        if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
        }
        return imageUrl;
    }

    function extractWalgreensPrice(productElement) {
        const priceSpan = productElement.querySelector('span.body-medium.bold');
        return priceSpan ? priceSpan.textContent.trim() : 'No price found';
    }

    function extractWalgreensProductUrl(productElement) {
        const productLinkTag = productElement.querySelector('a[href]');
        return productLinkTag ? 'https://www.walgreens.com' + productLinkTag.getAttribute('href') : 'No URL found';
    }

    function extractWalgreensPromotionText(productElement) {
        const promotionDiv = productElement.querySelector('div.product__deal');
        return promotionDiv ? promotionDiv.textContent.trim() : 'No promotion found';
    }

})();
