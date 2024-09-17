"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AmazonProductCard = ({ product }) => {
  if (!product) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-lg font-semibold">{product.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        <img
          src={product.image_url}
          alt={product.title}
          style={{ width: "400px", height: "400px", objectFit: "contain" }} // Matching the size from SourceProductCard
        />
        <div className="text-center">
          <p><strong>ASIN:</strong> {product.asin}</p>
          <p><strong>Buy Box Price:</strong> {product.last_seen_price}</p>
          <p><strong>Sellers:</strong> {product.current_sellers}</p>
          <p><strong>Amazon Buy Box Count:</strong> {product.amazon_buy_box_count}</p>
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
