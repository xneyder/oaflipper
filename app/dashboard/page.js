import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
export default async function Dashboard() {
  const supabase = createClient();
  
  // Fetch the data and check for errors
  
  // Fetch products and include the matching Amazon products via a join
  const { data: products, error } = await supabase
  .from("Product")
  .select(`
        *,
        ProductMatch (
          AmazonProduct (*)
        )
      `);
    
    if (error) {
      console.error("Error fetching matches:", error);
      return;
    }
    
    // Format the data to include Amazon products
    const formattedProducts = products.map((product) => ({
      ...product,
      amazon_products: product.ProductMatch.map((match) => ({
        ...match.amazon_product,
      })),
    }));
    
    
    if (error) {
      console.error("Error fetching products:", error.message);
    } else {
      console.log("Fetched data:", formattedProducts);
    }
    
    return (
      <main className="min-h-screen p-8 pb-24">
      <section className="max-w-xl mx-auto space-y-8">
      <h1 className="text-3xl md:text-4xl font-extrabold">Private Page</h1>
      <pre>{JSON.stringify(formattedProducts, null, 2)}</pre>
      </section>
      </main>
    );
  }
  