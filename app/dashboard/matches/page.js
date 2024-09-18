"use client";

import { useState, useEffect } from "react";
import apiClient from "@/libs/api";
import SourceProductCard from "@/app/dashboard/_assets/components/SourceProductCard";
import AmazonProductCarousel from "@/app/dashboard/_assets/components/AmazonProductCarousel";

export const dynamic = "force-dynamic";

export default function Matches() {
  const [products, setProducts] = useState([]);
  const [discount, setDiscount] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [finalPrices, setFinalPrices] = useState({});
  const [page, setPage] = useState(1); // Track current page
  const [totalProducts, setTotalProducts] = useState(0); // Track total number of products
  const limit = 10; // Define how many products to show per page

  // Fetch products function
  const fetchProducts = async (page) => {
    setIsLoading(true); 
    setError(null);

    try {
      const response = await apiClient.get(`/product/list?page=${page}&limit=${limit}`);
      console.log(response); // Debug the response
      const { data, total } = response; // Destructure the API response

      const filtered = data.map(product => ({
        ...product,
        ProductMatch: product.ProductMatch.filter(match => 
          !match.manual_invalid && 
          (match.AmazonProduct.amazon_buy_box_count < 40 || match.AmazonProduct.amazon_buy_box_count == undefined ) &&
          (match.AmazonProduct.current_sellers > 3 || match.AmazonProduct.current_sellers == undefined)
        )
      })).filter(product => product.ProductMatch.length > 0);

      setProducts(filtered);
      setTotalProducts(total); // Set totalProducts from the API response
    } catch (err) {
      setError(err?.message || "An error occurred while fetching products.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page);
  }, [page]);

  // Function to handle the final price change for each product
  const handleFinalPriceChange = (productId, finalPrice) => {
    setFinalPrices((prevPrices) => ({
      ...prevPrices,
      [productId]: finalPrice,
    }));
  };

  // Pagination controls
  const totalPages = Math.ceil(totalProducts / limit); // Calculate total pages

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
                  onFinalPriceChange={(finalPrice) => handleFinalPriceChange(product.id, finalPrice)} 
                />
              </div>

              {/* Right side: Carousel for Amazon products */}
              <div className="w-1/2 flex items-stretch">
                <AmazonProductCarousel 
                  products={product.ProductMatch} 
                  finalPrice={finalPrices[product.id]} 
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        !isLoading && <p>No products found.</p>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-between mt-4 space-x-4">
        {/* First Page Button */}
        <button
          disabled={page === 1}
          onClick={() => setPage(1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          First
        </button>

        {/* Previous Page Button */}
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </button>

        <span>Page {page} of {totalPages}</span>

        {/* Next Page Button */}
        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>

        {/* Last Page Button */}
        <button
          disabled={page === totalPages}
          onClick={() => setPage(totalPages)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Last
        </button>
      </div>
    </main>
  );
}
