"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SourceProductCard = ({ product, discount }) => {
  const [additionalDiscount, setAdditionalDiscount] = useState(0); // State to store the additional discount

  if (!product) return null;

  // Remove the dollar sign from the price and convert it to a float
  const originalPrice = parseFloat(product.last_seen_price.replace("$", ""));
  const discountedPrice = discount > 0 
    ? (originalPrice - (originalPrice * (discount / 100))).toFixed(2)
    : null;

  // Calculate the final price after applying the additional discount
  const basePrice = discountedPrice || originalPrice;
  const finalPrice = (basePrice - (basePrice * (additionalDiscount / 100))).toFixed(2);

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
        <p>Price: ${originalPrice}</p>
        {discountedPrice && (
          <p style={{ color: 'red' }}>Discounted Price: ${discountedPrice}</p>
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

        {/* Display final price after applying the additional discount */}
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
