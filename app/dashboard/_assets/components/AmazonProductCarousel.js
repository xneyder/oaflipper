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

const AmazonProductCarousel = ({ products }) => {
  const [api, setApi] = React.useState(null); 
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (!products || products.length === 0) {
    return <p>No Amazon products available</p>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <Carousel setApi={setApi} className="w-full max-w-lg">
        <CarouselContent>
          {products.map((productMatch, index) => (
            <CarouselItem key={index}>
              <Card className="flex justify-center items-center p-4"> 
                <CardContent>
                  <AmazonProductCard product={productMatch.AmazonProduct} />
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <div className="py-2 text-center text-sm text-muted-foreground">
        Slide {current} of {count}
      </div>
    </div>
  );
};

export default AmazonProductCarousel;
