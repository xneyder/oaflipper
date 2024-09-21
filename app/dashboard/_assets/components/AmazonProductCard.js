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

  // Calculate the fees required to achieve a 25% ROI
  const fees = lastSeenPrice - 1.25 * maxCost;

  // Calculate profit: Profit = Buy Box Price - Cost - Fees
  const profit = lastSeenPrice - parseFloat(cost || 0) - fees;

  // Calculate the actual ROI based on the user's input cost
  const actualROI = (profit / parseFloat(cost || 1)) * 100; // Avoid division by zero with cost defaulting to 1 if empty

  // New rule: profit is red if less than 3, otherwise check for 25% ROI
  const isProfitRed = profit < 3;

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
          
          {/* Display fees */}
          <div className="mt-4">
            <p><strong>Fees:</strong> ${fees.toFixed(2)}</p>
          </div>

          {/* Display max cost */}
          <div className="mt-4">
            <p><strong>Max Cost:</strong> ${maxCost.toFixed(2)}</p>
          </div>

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
                color: isProfitRed ? "red" : "green", // Red if profit < 3, green otherwise
                fontWeight: "bold",
              }}
            >
              Profit: ${profit.toFixed(2)}
            </p>
          </div>

          {/* Display the actual ROI */}
          <div className="mt-4">
            <p
              style={{
                color: actualROI >= 25 ? "green" : "red", // Green if actual ROI is 25% or above, red otherwise
                fontWeight: "bold",
              }}
            >
              Actual ROI: {actualROI.toFixed(2)}%
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
