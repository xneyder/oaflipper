"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AmazonProductCard = ({ product, finalPrice }) => {
  const [cost, setCost] = useState(0); // State for input cost

  useEffect(() => {
    // Set the cost to the final price whenever finalPrice changes
    if (finalPrice) {
      setCost(finalPrice); // Set the cost input field with the finalPrice
    }
  }, [finalPrice]); // Re-run this when finalPrice changes

  if (!product) return null;

  // Convert last_seen_price (buy box price) and max_cost to float after removing dollar signs
  const lastSeenPrice = parseFloat(product.last_seen_price.replace("$", ""));
  const maxCost = parseFloat(product.max_cost.replace("$", ""));

  // Calculate the ROI value for 25% profit: ROIValue = buy box price / 1.25
  const ROIValue = lastSeenPrice / 1.25;

  // Determine fees calculation based on whether ROIValue is less than or greater than 3
  let fees;
  if (ROIValue < 3) {
    // If ROIValue is less than 3, use the current fees calculation
    fees = lastSeenPrice - maxCost - 3;
  } else {
    // If ROIValue is greater than or equal to 3, use the new fees calculation
    fees = lastSeenPrice - ROIValue - 3;
  }

  // Calculate profit using the formula: profit = buy box price - cost - fees
  const profit = lastSeenPrice - parseFloat(cost || 0) - fees;

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
          <p><strong>Offers:</strong> {product.offers}</p>
          <p><strong>BSR:</strong> {product.bsr}</p>
          <p><strong>Amazon Buy Box Count:</strong> {product.amazon_buy_box_count}</p>
          <p><strong>Max Cost:</strong> ${maxCost.toFixed(2)}</p>

          {/* Input for user's cost (auto-populated with finalPrice) */}
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

          {/* Display profit */}
          <div className="mt-4">
            <p
              style={{
                color: profit < 3 ? "red" : "green", // Red if profit < 3, green if profit >= 3
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
