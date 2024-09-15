import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY // Ensure this is set in your `.env.local` file
});
const openai = new OpenAIApi(configuration);

// Function to find matching Amazon product images using OpenAI API
export async function findMatchingAmazonImages(product, amazonResults) {
  const imageUrls = product.image_urls;

  if (!imageUrls || imageUrls.length === 0) {
    console.log("No image URLs found for the product.");
    return [];
  }

  const firstImageUrl = imageUrls[0]; // Assuming the first image is relevant

  // Gather all the Amazon image URLs
  const amazonImageUrls = amazonResults
    .filter(result => result.image_url)
    .map(result => result.image_url);

  // Construct the prompt for OpenAI
  const prompt = `In the first image, I have a product. Check if the product is present in any of the other images, making sure it's the same product with the same colors and details. Return just an array of integer indexes of images that match the first image.`;

  const messages = [
    { role: "user", content: prompt },
    { role: "user", content: { image_url: firstImageUrl } }
  ];

  amazonImageUrls.forEach(imageUrl => {
    messages.push({ role: "user", content: { image_url: imageUrl } });
  });

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages,
      max_tokens: 300
    });

    const messageContent = response.data.choices[0].message.content.trim();
    return JSON.parse(messageContent);
  } catch (error) {
    console.error("Error querying OpenAI:", error);
    return [];
  }
}

// Analyze product based on rules using OpenAI API (or any other analysis method)
export async function analyzeProduct(asin) {
  console.log(`Analyzing product with ASIN: ${asin}`);

  // Mocked analysis logic (can be replaced with actual logic or OpenAI API calls)
  const amazon_buy_box_count = Math.floor(Math.random() * 100);  // Simulating analysis logic
  const current_sellers = Math.floor(Math.random() * 50);        // Simulating analysis logic

  // If using OpenAI for this analysis, you could construct a prompt similar to the one above

  return { amazon_buy_box_count, current_sellers };
}
