import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const supabase = createClient();
  
  // Authenticate the user using Supabase Auth helper
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { productMatchId, toBuy } = await req.json();

  if (!productMatchId) {
    return NextResponse.json({ error: "Missing product match ID" }, { status: 400 });
  }

  try {
    // Update the ProductMatch row with the new to_buy value
    const { error: updateError } = await supabase
      .from("ProductMatch")
      .update({ to_buy: toBuy }) // Update to_buy based on the passed value
      .eq("id", productMatchId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ message: `Product match marked as ${toBuy ? 'to buy' : 'not buy'}` }, { status: 200 });
  } catch (error) {
    console.error("Error updating product match:", error);
    return NextResponse.json({ error: "Failed to update product match" }, { status: 500 });
  }
}
