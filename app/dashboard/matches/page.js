import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
export default async function Dashboard() {
  const supabase = createClient();
  
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
    
    if (error) {
      console.error("Error fetching products:", error.message);
    } 
    
    return (
      <main className="min-h-screen p-8 pb-24">
      <h1 className="text-3xl md:text-4xl font-extrabold">Matches</h1>
      <pre>{JSON.stringify(products, null, 2)}</pre>
      </main>
    );
  }
  