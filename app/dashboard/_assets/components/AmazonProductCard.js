"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AmazonProductCard = ({ product }) => {
  const [cost, setCost] = useState(0); // State for input cost

  if (!product) return null;

  // Remove the dollar sign and convert last_seen_price to a float
  const lastSeenPrice = parseFloat(product.last_seen_price.replace("$", ""));

  // Calculate the variable referral fee based on the sale price
  const referralFeePercentage = lastSeenPrice > 10 ? 0.15 : 0.08; // 15% if above $10, else 8%
  const referralFee = lastSeenPrice * referralFeePercentage;

  const monthlyStorageFee = 0.41; // Constant from the screenshot
  const fulfillmentFee = 4.5; // Constant from the screenshot

  // Calculate total fees
  const totalFees = referralFee + monthlyStorageFee + fulfillmentFee;

  // Calculate profit based on user's cost input
  const profit = lastSeenPrice - totalFees - parseFloat(cost || 0); // Subtracting user's cost

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-lg font-semibold">
          {product.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        <img
          src={product.image_url}
          alt={product.title}
          style={{ width: "400px", height: "400px", objectFit: "contain" }} // Matching the size from SourceProductCard
        />
        <div className="text-center">
          <p><strong>ASIN:</strong> {product.asin}</p>
          <p><strong>Buy Box Price:</strong> ${lastSeenPrice.toFixed(2)}</p>
          <p><strong>Sellers:</strong> {product.current_sellers}</p>
          <p><strong>Amazon Buy Box Count:</strong> {product.amazon_buy_box_count}</p>

          {/* Input for user's cost */}
          <div className="mt-4">
            <label htmlFor="cost" className="block font-semibold">
              Enter Your Cost:
            </label>
            <input
              type="number"
              id="cost"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="border p-2"
              placeholder="Enter cost in USD"
            />
          </div>

          {/* Display profit based on user's cost */}
          <div className="mt-4">
            <p
              style={{
                color: profit >= 0 ? "green" : "red", // Show green if profit is positive, red if negative
                fontWeight: "bold",
              }}
            >
              Profit: ${profit.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-center">
        <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
          View on Amazon
        </a>
      </CardFooter>
    </Card>
  );
};

export default AmazonProductCard;
