"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const supabase = createClientComponentClient();

  const fetchMatches = async () => {
    // Fetch products and include the matching Amazon products via a join
    const { data: products, error } = await supabase
      .from("Product")
      .select(`
        *,
        product_matches (
          amazon_product (*)
        )
      `);

    if (error) {
      console.error("Error fetching matches:", error);
      return;
    }

    // Format the data to include Amazon products
    const formattedProducts = products.map((product) => ({
      ...product,
      amazon_products: product.product_matches.map((match) => ({
        ...match.amazon_product,
      })),
    }));

    setMatches(formattedProducts);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  return (
    <>
      <h1>Matches</h1>
      <pre>{JSON.stringify(matches, null, 2)}</pre>
    </>
  );
}
