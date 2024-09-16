import axios from "axios";

const KEEPA_API_KEY = process.env.KEEPA_API; // Make sure your API key is set in the environment variables

// Function to convert Keepa time to Unix time
function keepaTimeMinutesToUnixTime(keepaMinutes) {
  return (21564000 + parseInt(keepaMinutes)) * 60000;
}

// Transform prices data to list
function transformKeepaHistoryList(buyBoxSellerHistory) {
  return buyBoxSellerHistory.reduce((acc, curr, index) => {
    if (index % 2 === 0) {
      const timestamp = new Date(keepaTimeMinutesToUnixTime(curr)).toISOString();
      acc.push({ date: timestamp });
    } else {
      acc[acc.length - 1].seller = curr;
    }
    return acc;
  }, []);
}

// Fill missing days in the history to make sure all days are represented
function fillMissingDays(historyList, lastNDays = 90) {
  const allDates = [];
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - lastNDays);

  // Generate date array for the last N days
  for (let d = pastDate; d <= today; d.setDate(d.getDate() + 1)) {
    allDates.push(new Date(d).toISOString().split("T")[0]);
  }

  // Create a map of seller history keyed by date
  const sellerHistoryMap = historyList.reduce((map, entry) => {
    const dateKey = entry.date.split("T")[0];
    map[dateKey] = entry.seller;
    return map;
  }, {});

  // Fill missing dates
  return allDates.map(date => ({
    date,
    seller: sellerHistoryMap[date] || null, // Default to `null` if no data for the date
  }));
}

// Fetch historical data from Keepa API
async function fetchHistoricalData(asin) {
  try {
    if (!KEEPA_API_KEY) {
      throw new Error("Missing Keepa API key. Set 'KEEPA_API' in your environment variables.");
    }

    const response = await axios.get(`https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=1&asin=${asin}&stats=90&offers=20&buybox=true&history=1&days=365`);
    const productData = response.data.products;

    return productData.length > 0 ? productData[0] : null;
  } catch (error) {
    console.error(`Error fetching data from Keepa: ${error.message}`);
    return null;
  }
}

// Get the Amazon buy box count over the last 90 days
function getAmazonBuyBoxCount(buyBoxSellerHistory) {
  if (!buyBoxSellerHistory) {
    console.log("No buy box seller history available.");
    return -1;
  }

  // Transform history into a list
  const transformedHistory = transformKeepaHistoryList(buyBoxSellerHistory);
  const filledHistory = fillMissingDays(transformedHistory);

  // Amazon's seller ID for buy box
  const amazonSellerId = "ATVPDKIKX0DER";
  const amazonBuyBoxDays = filledHistory.filter(entry => entry.seller === amazonSellerId).length;

  return amazonBuyBoxDays;
}

// Analyze product using Keepa API
export async function analyzeProduct(asin) {
  console.log(`Analyzing product with ASIN: ${asin}`);

  // Fetch historical data from Keepa
  const historicalData = await fetchHistoricalData(asin);
  if (!historicalData) {
    console.error("Failed to fetch historical data from Keepa.");
    return { amazon_buy_box_count: -1, current_sellers: -1 };
  }

  const buyBoxSellerHistory = historicalData.buyBoxSellerIdHistory || [];
  const current_sellers = historicalData.stats['totalOfferCount'];

  // Get Amazon buy box count and current sellers
  const amazon_buy_box_count = getAmazonBuyBoxCount(buyBoxSellerHistory);

  console.log(`Amazon buy box count: ${amazon_buy_box_count}, Current sellers: ${current_sellers}`);

  return { amazon_buy_box_count, current_sellers };
}
