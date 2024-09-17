"use client";

import { useState, useEffect } from "react";
import apiClient from "@/libs/api"; // Assuming you have an API client setup for making HTTP requests
import SourceProductCard from "@/app/dashboard/_assets/components/SourceProductCard";
import AmazonProductCarousel from "@/app/dashboard/_assets/components/AmazonProductCarousel";

export const dynamic = "force-dynamic";

export default function Matches() {
  const [products, setProducts] = useState([]);
  const [discount, setDiscount] = useState(0); // State to track the global discount
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state
  const [finalPrices, setFinalPrices] = useState({}); // State to track the final prices for each product

  // Fetch products function
  const fetchProducts = async () => {
    setIsLoading(true); // Start loading
    setError(null); // Reset any previous errors

    try {
      const { data } = await apiClient.get("/product/list"); // Fetching from your API
      const filtered = data.map(product => ({
        ...product,
        ProductMatch: product.ProductMatch.filter(match => 
          !match.manual_invalid && // Exclude matches where manual_invalid is true
          match.AmazonProduct.amazon_buy_box_count < 40 &&
          match.AmazonProduct.current_sellers > 3
        )
      })).filter(product => product.ProductMatch.length > 0);

      setProducts(filtered); // Set products to state
    } catch (err) {
      setError(err?.message || "An error occurred while fetching products.");
      console.error(err);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  useEffect(() => {
    fetchProducts(); // Fetch products on component mount
  }, []);

  // Function to handle the final price change for each product
  const handleFinalPriceChange = (productId, finalPrice) => {
    setFinalPrices((prevPrices) => ({
      ...prevPrices,
      [productId]: finalPrice, // Store final price for the specific product
    }));
  };

  return (
    <main className="min-h-screen p-8 pb-24">
      <h1 className="text-3xl md:text-4xl font-extrabold">Product Matches</h1>

      {/* Input for Global Discount */}
      <div className="mb-4">
        <label htmlFor="discount" className="block font-semibold">
          Global Discount (%):
        </label>
        <input
          id="discount"
          type="number"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          min="0"
          max="100"
          className="border p-2"
        />
      </div>

      {/* Error Handling */}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Product Display */}
      {!isLoading && products && products.length > 0 ? (
        products.map((product) => (
          <div key={product.id} className="flex space-x-8 mb-8">
            <div className="flex w-full">
              {/* Left side: Main product card */}
              <div className="w-1/2 flex items-stretch">
                <SourceProductCard 
                  product={product} 
                  discount={discount} 
                  onFinalPriceChange={(finalPrice) => handleFinalPriceChange(product.id, finalPrice)} // Pass handler to set final price
                />
              </div>

              {/* Right side: Carousel for Amazon products */}
              <div className="w-1/2 flex items-stretch">
                <AmazonProductCarousel 
                  products={product.ProductMatch} 
                  finalPrice={finalPrices[product.id]} // Pass final price to each product
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        !isLoading && <p>No products found.</p>
      )}
    </main>
  );
}
