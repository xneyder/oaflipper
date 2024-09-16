import { PrismaClient } from '@prisma/client';
import { analyzeProduct } from './openai';  // Import analyzeProduct from openai.js

const prisma = new PrismaClient();

// Insert or update product and match data in the database
export async function insertOrUpdateDataToDB(productData, amazonData) {
  try {
    // Upsert the product in the database (insert or update)
    const product = await prisma.product.upsert({
      where: { product_url: productData.product_url },
      update: {
        title: productData.title,
        image_urls: productData.image_urls,
        last_seen_price: productData.price,
        in_stock: true
      },
      create: {
        asin: productData.asin,
        title: productData.title,
        image_urls: productData.image_urls,
        product_url: productData.product_url,
        source: productData.source,
        last_seen_price: productData.price,
        in_stock: true
      }
    });

    // Loop through each Amazon product data and upsert it
    console.log(amazonData);
    for (const amazon of amazonData) {
      console.log(`Processing Amazon product with ASIN: ${amazon.asin}`);
      const amazonProduct = await prisma.amazonProduct.upsert({
        where: { asin: amazon.asin },
        update: {
          title: amazon.title,
          product_url: amazon.url,
          image_url: amazon.image_url
        },
        create: {
          asin: amazon.asin,
          title: amazon.title,
          product_url: amazon.url,
          image_url: amazon.image_url
        }
      });

      // Upsert the product match between product and amazonProduct
      await prisma.productMatch.upsert({
        where: {
          product_id_amazon_product_id: {
            product_id: product.id,
            amazon_product_id: amazonProduct.id
          }
        },
        create: {
          product_id: product.id,
          amazon_product_id: amazonProduct.id
        },
        update: {}
      });
    }
  } catch (error) {
    console.error("Error inserting or updating data in the database:", error);
  }
}

// Analyze and update products
export async function analyzeAndUpdateProducts(productUrl) {
  try {
    // Find all AmazonProduct entries that match the product URL
    const amazonProducts = await prisma.amazonProduct.findMany({
      where: { product_url: productUrl }
    });

    if (amazonProducts.length === 0) {
      console.log(`No AmazonProducts found for URL: ${productUrl}`);
      return;
    }

    // Loop through each AmazonProduct found
    for (const amazonProduct of amazonProducts) {
      console.log(`Processing Amazon product with ASIN: ${amazonProduct.asin}`);

      // Use the analyzeProduct function to analyze the product using the ASIN
      const { amazon_buy_box_count, current_sellers } = await analyzeProduct(amazonProduct.asin);

      // Update the AmazonProduct with the buy box count and current sellers
      await prisma.amazonProduct.update({
        where: { asin: amazonProduct.asin },
        data: {
          amazon_buy_box_count,
          current_sellers
        }
      });

      console.log(`Updated AmazonProduct ${amazonProduct.asin} with buy box count ${amazon_buy_box_count} and current sellers ${current_sellers}`);
    }
  } catch (error) {
    console.error("Error analyzing and updating Amazon products:", error);
  }
}

