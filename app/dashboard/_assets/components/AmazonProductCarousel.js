"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import AmazonProductCard from "@/app/dashboard/_assets/components/AmazonProductCard";

const AmazonProductCarousel = ({ products, finalPrice }) => {
  const [api, setApi] = React.useState(null); 
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  // Filter out Amazon products with a profit less than 1
  const filteredProducts = products.filter((productMatch) => {
    const product = productMatch.AmazonProduct;
    
    // Calculate the fees and profit here
    const lastSeenPrice = parseFloat(product.last_seen_price.replace("$", ""));
    const referralFeePercentage = lastSeenPrice > 10 ? 0.15 : 0.08;
    const referralFee = lastSeenPrice * referralFeePercentage;
    const monthlyStorageFee = 0.41;
    const fulfillmentFee = 4.5;

    // Calculate total fees and profit
    const totalFees = referralFee + monthlyStorageFee + fulfillmentFee;
    const profit = lastSeenPrice - totalFees - parseFloat(finalPrice || 0); // Subtracting finalPrice from the SourceProductCard

    return profit >= 1; // Keep only products with profit >= 1
  });

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (!filteredProducts || filteredProducts.length === 0) {
    return <p>No Amazon products available</p>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <Carousel setApi={setApi} className="w-full max-w-lg">
        <CarouselContent>
          {filteredProducts.map((productMatch, index) => (
            <CarouselItem key={index}>
              <Card className="flex justify-center items-center p-4"> 
                <CardContent>
                  <AmazonProductCard product={productMatch.AmazonProduct} finalPrice={finalPrice} />
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <div className="py-2 text-center text-sm text-muted-foreground">
        Slide {current} of {filteredProducts.length}
      </div>
    </div>
  );
};

export default AmazonProductCarousel;
