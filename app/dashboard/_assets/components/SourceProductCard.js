"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SourceProductCard = ({ product, discount, onFinalPriceChange }) => {
  const [additionalDiscount, setAdditionalDiscount] = useState(0); // State to store the additional discount
  const [bogoDiscount, setBogoDiscount] = useState(0); // State to store the Bogo discount

  if (!product) return null;

  // Remove the dollar sign from the price and convert it to a float
  const originalPrice = parseFloat(product.last_seen_price.replace("$", ""));

  // Apply global discount if applicable
  const discountedPrice = discount > 0 
    ? originalPrice - (originalPrice * (discount / 100))
    : originalPrice;

  // Apply Bogo discount (25% or 50%) first
  const priceAfterBogo = discountedPrice - (discountedPrice * (bogoDiscount / 100));

  // Apply additional discount on top of Bogo-adjusted price
  const finalPrice = Math.max(
    (priceAfterBogo - (priceAfterBogo * (additionalDiscount / 100))).toFixed(2),
    0 // Ensure price doesn't go below zero
  );

  // Notify parent component of the final price when it changes
  useEffect(() => {
    onFinalPriceChange(finalPrice);
  }, [finalPrice]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <img
          src={product.image_urls[0]}
          alt={product.title}
          style={{ width: '400px', height: '400px' }}
        />
        <p>Price: ${originalPrice.toFixed(2)}</p>
        {discount > 0 && (
          <p style={{ color: 'red' }}>Discounted Price: ${discountedPrice.toFixed(2)}</p>
        )}
        <p>Source: {product.source}</p>
        <p style={{ color: 'red' }}>{product.promotionText}</p>

        {/* Input for the additional discount */}
        <div className="mt-4">
          <label htmlFor="additional-discount" className="block font-semibold">
            Additional Discount (%):
          </label>
          <input
            type="number"
            id="additional-discount"
            value={additionalDiscount}
            onChange={(e) => setAdditionalDiscount(e.target.value)}
            min="0"
            max="100"
            className="border p-2"
            placeholder="Enter additional discount"
          />
        </div>

        {/* Toggle buttons for Bogo discounts */}
        <div className="mt-4">
          <label className="block font-semibold">Select Bogo Option:</label>
          <div className="flex space-x-4">
            <label>
              <input
                type="radio"
                name="bogo"
                value="bogo50"
                checked={bogoDiscount === 25} // 25% discount for Bogo 50%
                onChange={() => setBogoDiscount(25)}
              />
              Bogo 50% (25% Discount)
            </label>
            <label>
              <input
                type="radio"
                name="bogo"
                value="bogo"
                checked={bogoDiscount === 50} // 50% discount for Bogo
                onChange={() => setBogoDiscount(50)}
              />
              Bogo (50% Discount)
            </label>
            <label>
              <input
                type="radio"
                name="bogo"
                value="none"
                checked={bogoDiscount === 0} // No Bogo discount
                onChange={() => setBogoDiscount(0)}
              />
              None
            </label>
          </div>
        </div>

        {/* Display final price after applying Bogo and additional discount */}
        <div className="mt-4">
          <p style={{ color: 'green' }}>
            Final Price After Additional Discount: ${finalPrice}
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <a href={product.product_url} target="_blank" rel="noopener noreferrer">
          View Product
        </a>
      </CardFooter>
    </Card>
  );
};

export default SourceProductCard;
