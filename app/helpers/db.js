import { PrismaClient } from '@prisma/client';
import { analyzeProduct } from './keepa';  // Import analyzeProduct from openai.js
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid'; // Import the uuid package


const prisma = new PrismaClient();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Add your access key
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Add your secret key
  region: 'us-east-1', // Replace with your region
});

// Helper function to upload screenshot to S3
async function uploadScreenshotToS3(screenshotBase64) {
  const buffer = Buffer.from(
    screenshotBase64.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  );

  // Generate a unique filename using UUID and timestamp
  const uniqueFilename = `${uuidv4()}-${Date.now()}.png`;

  const params = {
    Bucket: 'oaflipper-shots',
    Key: uniqueFilename, // Use the unique filename
    Body: buffer,
    ContentEncoding: 'base64', // Required for base64 encoding
    ContentType: 'image/png', // Image format
    ACL: 'public-read', // Set the ACL to public-read to get a public URL
  };

  try {
    const { Location } = await s3.upload(params).promise();
    return Location; // Return the URL of the uploaded screenshot
  } catch (error) {
    console.error('Error uploading screenshot to S3:', error);
    throw new Error('Failed to upload screenshot');
  }
}

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
        in_stock: true,
        promotionText: productData.promotionText,
      },
      create: {
        asin: productData.asin,
        title: productData.title,
        image_urls: productData.image_urls,
        product_url: productData.product_url,
        source: productData.source,
        last_seen_price: productData.price,
        in_stock: true,
        promotionText: productData.promotionText,
      },
    });
    console.log(`Inserted product: ${productData.title}`);

    // Loop through each Amazon product data and upsert it
    for (const amazon of amazonData) {
      console.log(`Processing Amazon product: ${amazon.title}`);
      const amazonProduct = await prisma.amazonProduct.upsert({
        where: { asin: amazon.asin },
        update: {
          title: amazon.title,
          product_url: amazon.product_url,
          image_url: amazon.image_url,
          last_seen_price: amazon.price,
          upc : amazon.upc,
          bsr: amazon.bsr,
          max_cost: amazon.max_cost,
          offers: amazon.offers,
        },
        create: {
          asin: amazon.asin,
          title: amazon.title,
          product_url: amazon.product_url,
          image_url: amazon.image_url,
          last_seen_price: amazon.price,
          upc : amazon.upc,
          bsr: amazon.bsr,
          max_cost: amazon.max_cost,
          offers: amazon.offers,
        },
      });

      // Upsert the product match between product and amazonProduct
      await prisma.productMatch.upsert({
        where: {
          product_id_amazon_product_id: {
            product_id: product.id,
            amazon_product_id: amazonProduct.id,
          },
        },
        create: {
          product_id: product.id,
          amazon_product_id: amazonProduct.id,
          manual_invalid: false,
        },
        update: {
          // manual_invalid: false,
        },
      });
      console.log(`Inserted Amazon product: ${amazon.title}`);
    }
  } catch (error) {
    console.error('Error inserting or updating data in the database:', error);
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
      where: { product_id: product.id, manual_invalid: false },
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
      const { amazon_buy_box_count, current_sellers, buy_box_price } = await analyzeProduct(amazonProduct.asin);

      console.log(`Analyzed AmazonProduct ${amazonProduct.asin} with buy box count ${amazon_buy_box_count} and current sellers ${current_sellers} and buy box price ${buy_box_price}`);

      if (amazon_buy_box_count === -1 || current_sellers === -1) {
        console.log(`Failed to analyze AmazonProduct ${amazonProduct.asin}`);
        continue;
      }

      // Step 5: Update the AmazonProduct with the buy box count and current sellers
      await prisma.amazonProduct.update({
        where: { asin: amazonProduct.asin },
        data: {
          amazon_buy_box_count,
          current_sellers,
          buy_box_price,
        },
      });

      // console.log(`Updated AmazonProduct ${amazonProduct.asin} with buy box count ${amazon_buy_box_count} and current sellers ${current_sellers} and buy box price ${buy_box_price}`);
    }
  } catch (error) {
    console.error("Error analyzing and updating Amazon products:", error);
  }
}

