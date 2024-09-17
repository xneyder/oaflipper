"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SourceProductCard = ({ product, discount }) => {
  if (!product) return null;

  // Remove the dollar sign from the price and convert it to a float
  const originalPrice = parseFloat(product.last_seen_price.replace("$", ""));
  const discountedPrice = discount > 0 
    ? (originalPrice - (originalPrice * (discount / 100))).toFixed(2)
    : null;

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
