"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AmazonProductCard = ({ product, productMatchId, finalPrice, onRemove, onNext, onPrev, toBuyDb }) => {
  const [cost, setCost] = useState(0); // State for input cost
  const [toBuy, setToBuy] = useState(toBuyDb); // Initialize to the value from the database

  useEffect(() => {
    // Set the cost to the final price whenever finalPrice changes
    if (finalPrice) {
      setCost(finalPrice); // Set the cost input field with the finalPrice
    }
  }, [finalPrice]);

  const handleNoMatch = async () => {
    try {
      const response = await fetch('/api/product/invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productMatchId }), // Pass the productMatchId
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to mark no match:', result.error);
        return;
      }

      console.log('Product marked as No Match successfully.');
      // Call the onRemove function passed from the carousel
      onRemove(productMatchId);
    } catch (error) {
      console.error('Error marking no match:', error);
    }
  };

  const handleToBuy = async () => {
    try {
      const response = await fetch('/api/product/to_buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productMatchId, toBuy: !toBuy }), // Toggle to_buy status
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to toggle buy status:', result.error);
        return;
      }

      console.log(`Product ${!toBuy ? 'marked as' : 'unmarked from'} to buy successfully.`);
      // Toggle the to_buy state
      setToBuy(!toBuy);
      // Move to next product after action
      onNext();
    } catch (error) {
      console.error('Error toggling buy status:', error);
    }
  };

  if (!product) return null;

  // Convert last_seen_price (buy box price) and max_cost to float after removing dollar signs
  const lastSeenPrice = parseFloat(product.last_seen_price.replace("$", ""));
  const maxCost = parseFloat(product.max_cost.replace("$", ""));

  // Clean and convert fees (remove spaces, $, and convert to float)
  const fees = parseFloat(product.fees.replace(/\s+/g, '').replace('$', ''));

  // Calculate profit: Profit = Buy Box Price - Cost - Fees
  const profit = lastSeenPrice - parseFloat(cost || 0) - fees;

  // If the profit is less than 0, do not render the card
  if (profit < 0) {
    return null; // Hide the card if profit is less than 0
  }

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
          {/* Display fees */}
          <p><strong>Fees:</strong> ${fees.toFixed(2)}</p>

          <p><strong>Max Cost:</strong> ${maxCost.toFixed(2)}</p>

          {/* Input for user's cost (auto-populated with finalPrice) */}
          <div className="flex items-center space-x-2">
            <label htmlFor="cost" className="font-semibold">
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
          <p
            style={{
              color: isProfitRed ? "red" : "green", // Red if profit < 3, green otherwise
              fontWeight: "bold",
            }}
          >
            Profit: ${profit.toFixed(2)}
          </p>

          <p
            style={{
              color: actualROI >= 25 ? "green" : "red", // Green if actual ROI is 25% or above, red otherwise
              fontWeight: "bold",
            }}
          >
            ROI: {actualROI.toFixed(2)}%
          </p>
        </div>
      </CardContent>
      <CardFooter className="text-center">

        {/* Add the "Prev" button */}
        <button
          onClick={onPrev}
          className="ml-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Prev
        </button>

        <a href={product.product_url} target="_blank" rel="noopener noreferrer">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Amazon
          </button>
        </a>

        {/* Add the "No Match" button */}
        <button
          onClick={handleNoMatch}
          className="ml-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          No Match
        </button>

        {/* Toggle between "Buy" and "Not Buy" based on the `toBuy` state */}
        <button
          onClick={handleToBuy}
          className={`ml-4 px-4 py-2 ${toBuy ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded`}
        >
          {toBuy ? 'Not Buy' : 'Buy'}
        </button>

        {/* Add the "Next" button */}
        <button
          onClick={onNext}
          className="ml-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Next
        </button>

      </CardFooter>
    </Card>
  );
};

export default AmazonProductCard;
