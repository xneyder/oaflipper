"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

  // Apply Bogo discount (25%, 33.3%, or 50%) first
  const priceAfterBogo = discountedPrice - (discountedPrice * (bogoDiscount / 100));

  // Apply additional discount on top of Bogo-adjusted price
  const finalPrice = Math.max(
    (priceAfterBogo - (priceAfterBogo * (additionalDiscount / 100))).toFixed(2),
    0 // Ensure price doesn't go below zero
  );

  // Automatically select Bogo discount based on promotion text
  useEffect(() => {
    const promotionText = product.promotionText.toLowerCase();

    if (promotionText.includes("buy 1, get 1 free")) {
      setBogoDiscount(50); // 50% Discount
    } else if (promotionText.includes("buy 1, get 1 50% off")) {
      setBogoDiscount(25); // 25% Discount
    } else if (promotionText.includes("buy 2, get 3rd free")) {
      setBogoDiscount(33.3); // 33.3% Discount
    } else {
      setBogoDiscount(0); // No Bogo discount
    }
  }, [product.promotionText]);

  // Notify parent component of the final price when it changes
  useEffect(() => {
    onFinalPriceChange(finalPrice);
  }, [finalPrice]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.title}</CardTitle>
        <CardDescription>{product.source}</CardDescription>
      </CardHeader>
      <CardContent>
        <img
          src={product.image_urls}
          alt={product.title}
          style={{ width: '400px', height: '400px' }}
        />
        <p>Price: ${originalPrice.toFixed(2)}</p>
        {discount > 0 && (
          <p style={{ color: 'red' }}>Discounted Price: ${discountedPrice.toFixed(2)}</p>
        )}
        <p style={{ color: 'red' }}>{product.promotionText}</p>

        {/* Radio Group for Bogo discounts */}
        <div className="mt-4">
          <RadioGroup
            value={bogoDiscount.toString()}
            onValueChange={(value) => setBogoDiscount(parseFloat(value))} // Convert the value back to a number
          >
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="25" id="bogo50" />
                <Label htmlFor="bogo50">Bogo 50% (25% Discount)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="50" id="bogo" />
                <Label htmlFor="bogo">Bogo (50% Discount)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="33.3" id="bogo33" />
                <Label htmlFor="bogo33">Bogo 33.3% (Buy 2, get 3rd FREE)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0" id="none" />
                <Label htmlFor="none">None</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Input for the additional discount */}
        <div className="mt-4 flex items-center space-x-2">
          <label htmlFor="additional-discount" className="font-semibold">
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

        {/* Display final price after applying Bogo and additional discount */}
        <div className="mt-4">
          <p style={{ color: 'green' }}>
            Final Price After Additional Discounts: <strong>${finalPrice}</strong>
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
