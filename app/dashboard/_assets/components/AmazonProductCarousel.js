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

// Utility function for calculating profit and fees (shared with AmazonProductCard)
const calculateProfitAndFees = (product, finalPrice) => {
  const lastSeenPrice = parseFloat(product.last_seen_price.replace("$", ""));
  const maxCost = parseFloat(product.max_cost.replace("$", ""));
  const referralFeePercentage = lastSeenPrice > 10 ? 0.15 : 0.08;
  const referralFee = lastSeenPrice * referralFeePercentage;
  const monthlyStorageFee = 0.41;
  const fulfillmentFee = 4.5;

  // Calculate total fees
  const totalFees = referralFee + monthlyStorageFee + fulfillmentFee;

  // Calculate the actual profit
  const profit = lastSeenPrice - (parseFloat(finalPrice || 0)) - totalFees;

  return { profit };
};

const AmazonProductCarousel = ({ products, finalPrice }) => {
  const [filteredProducts, setFilteredProducts] = React.useState(() => {
    return products.filter((productMatch) => {
      const product = productMatch.AmazonProduct;

      const { profit } = calculateProfitAndFees(product, finalPrice); // Use the shared utility function

      return profit >= 1; // Filter products based on calculated profit
    });
  });

  const [api, setApi] = React.useState(null);
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const handleRemoveProduct = (productMatchId) => {
    setFilteredProducts((prevProducts) =>
      prevProducts.filter((productMatch) => productMatch.id !== productMatchId)
    );
  };

  const handleNextProduct = () => {
    if (api && current < count - 1) {
      api.scrollTo(current);  // Move to the next slide
    }
  };

  const handlePrevProduct = () => {
    if (api && current > 0) {
      api.scrollTo(current - 2);  // Move to the previous slide
    }
  };

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
                  <AmazonProductCard
                    product={productMatch.AmazonProduct}
                    productMatchId={productMatch.id}
                    finalPrice={finalPrice}
                    onRemove={handleRemoveProduct}
                    onNext={handleNextProduct}
                    onPrev={handlePrevProduct}
                    toBuyDb={productMatch.to_buy}
                  />
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
