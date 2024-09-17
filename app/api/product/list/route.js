import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const supabase = createClient();
  
  // Authenticate the user using the Supabase Auth helper
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    // Fetching products along with ProductMatch and AmazonProduct
    const { data, error } = await supabase
      .from("Product")
      .select(`
        *,
        ProductMatch (
          AmazonProduct (*)
        )
      `);

    if (error) {
      throw error;
    }

    // Filter out invalid matches
    const filteredProducts = data.map((product) => ({
      ...product,
      ProductMatch: product.ProductMatch.filter(
        (match) =>
          !match.manual_invalid && // Exclude matches where manual_invalid is true
          match.AmazonProduct.amazon_buy_box_count < 40 &&
          match.AmazonProduct.current_sellers > 3
      ),
    })).filter(product => product.ProductMatch.length > 0); // Exclude products without valid matches

    // Return the filtered product data
    return NextResponse.json({ data: filteredProducts }, { status: 200 });
  } catch (e) {
    console.error("Error fetching products:", e);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
