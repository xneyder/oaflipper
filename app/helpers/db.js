import { PrismaClient } from '@prisma/client';
import { analyzeProduct } from './keepa';  // Import analyzeProduct from openai.js

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
    console.log(`Inserted product: ${productData.title}`);

    // Loop through each Amazon product data and upsert it
    for (const amazon of amazonData) {
      console.log(`Processing Amazon product: ${amazon}`);
      const amazonProduct = await prisma.amazonProduct.upsert({
        where: { asin: amazon.asin },
        update: {
          title: amazon.title,
          product_url: amazon.product_url,
          image_url: amazon.image_url
        },
        create: {
          asin: amazon.asin,
          title: amazon.title,
          product_url: amazon.product_url,
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
      console.log(`Inserted Amazon product: ${amazon.title}`);
    }

  } catch (error) {
    console.error("Error inserting or updating data in the database:", error);
  }
}

// Analyze and update products
export async function analyzeAndUpdateProducts(productUrl) {
  try {
    // Step 1: Find the product by its URL
    const product = await prisma.product.findUnique({
      where: { product_url: productUrl },
    });

    if (!product) {
      console.log(`No product found for URL: ${productUrl}`);
      return;
    }

    // Step 2: Find all ProductMatch entries that reference this product
    const productMatches = await prisma.productMatch.findMany({
      where: { product_id: product.id },
    });

    if (productMatches.length === 0) {
      console.log(`No ProductMatch entries found for Product ID: ${product.id}`);
      return;
    }

    // Step 3: Loop through ProductMatch and get corresponding AmazonProduct entries
    for (const match of productMatches) {
      const amazonProduct = await prisma.amazonProduct.findUnique({
        where: { id: match.amazon_product_id },
      });

      if (!amazonProduct) {
        console.log(`No AmazonProduct found for ID: ${match.amazon_product_id}`);
        continue;
      }

      console.log(`Analyzing AmazonProduct with ASIN: ${amazonProduct.asin}`);

      // Step 4: Use the analyzeProduct function to analyze the product using the ASIN
      const { amazon_buy_box_count, current_sellers } = await analyzeProduct(amazonProduct.asin);

      console.log(`Analyzed AmazonProduct ${amazonProduct.asin} with buy box count ${amazon_buy_box_count} and current sellers ${current_sellers}`);

      // Step 5: Update the AmazonProduct with the buy box count and current sellers
      await prisma.amazonProduct.update({
        where: { asin: amazonProduct.asin },
        data: {
          amazon_buy_box_count,
          current_sellers,
        },
      });

      console.log(`Updated AmazonProduct ${amazonProduct.asin} with buy box count ${amazon_buy_box_count} and current sellers ${current_sellers}`);
    }
  } catch (error) {
    console.error("Error analyzing and updating Amazon products:", error);
  }
}

