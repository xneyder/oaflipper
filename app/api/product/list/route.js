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

  // Extract pagination info from query params
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit")) || 20; // default limit to 20
  const page = parseInt(searchParams.get("page")) || 1; // default to page 1
  const offset = (page - 1) * limit;

  try {
    // Fetch products with pagination
    const { data, error, count } = await supabase
      .from("Product")
      .select(`
        *,
        ProductMatch (
          *,
          AmazonProduct (*)
        )
      `, { count: 'exact' })
      .eq('ProductMatch.manual_invalid', false) 
      .order("updated_date", { ascending: false }) // 'exact' to get the total number of rows
      .range(offset, offset + limit - 1);  // Paginate the result


    


    if (error) {
      throw error;
    }

    // Filter out invalid matches
    const filteredProducts = data.map((product) => ({
      ...product,
      ProductMatch: product.ProductMatch.filter(
        (match) =>
          !match.manual_invalid && 
          (match.AmazonProduct.amazon_buy_box_count < 40 || match.AmazonProduct.amazon_buy_box_count == undefined) &&
          (match.AmazonProduct.current_sellers > 3 || match.AmazonProduct.current_sellers == undefined)
      ),
    })).filter(product => product.ProductMatch.length > 0);

    // Return data with pagination info
    return NextResponse.json({ 
      data: filteredProducts,
      page,
      limit,
      total: count, // Return the total number of rows for pagination
    }, { status: 200 });
  } catch (e) {
    console.error("Error fetching products:", e);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
