import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Ensure this is set in your `.env.local` file
});

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
  const prompt = `In the first image, I have a product. Check if the product is present in any of the other images, the product can be in a different packaging so it is ok. Return just an array of integer indexes of images that match the first image, no other text in the response just the array.`;

  // Prepare the message structure like the Python version
  const message = [
    { role: "system", content: "You are a customer looking for a product." },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: firstImageUrl } },
      ],
    },
  ];

  // Append each Amazon image URL to the message
  amazonImageUrls.forEach(imageUrl => {
    message[1].content.push({
      type: "image_url",
      image_url: { url: imageUrl },
    });
  });

  // console.log(message);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: message,
      max_tokens: 300,
    });

    // console.log(response.choices[0].message.content);

    const messageContent = response.choices[0].message.content.trim();
    return JSON.parse(messageContent);
  } catch (error) {
    console.error("Error querying OpenAI:", error);
    return [];
  }
}
