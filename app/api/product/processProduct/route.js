import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";
import { insertOrUpdateDataToDB, analyzeAndUpdateProducts } from '../../../helpers/db';
import { findMatchingAmazonImages } from '../../../helpers/openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Export POST method as a named export
export async function POST(req) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            // Not Signed in
            return NextResponse.json({ error: "Not signed in" }, { status: 401 });
        }
        
        const body = await req.json(); // Parse request body
        const { product, amazon_results } = body;
        
        if (!product || !amazon_results) {
            return NextResponse.json({ message: 'Invalid request, missing product or amazon_results' }, { status: 400 });
        }
        
        // console.log('Product:', product);
        // console.log('Amazon Results:', amazon_results);
        
        // Call the processProduct function
        await insertOrUpdateDataToDB(product, amazon_results);
        // await processProduct(product, amazon_results);
        return NextResponse.json({ message: 'Product processed successfully' }, { status: 200 });
    } catch (error) {
        console.error("Error processing product:", error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

async function processProduct(product, amazon_results) {
    let matchingAmazon=amazon_results;
    // const productUrl = product.product_url;
    
    // // Look for the existing product in the database
    // const title = product.title;
    // const existingProduct = await prisma.product.findUnique({
    //     where: { product_url: productUrl }
    // });
    
    // let matchingAmazon;
    // if (existingProduct) {
    //     console.log(`Product with URL ${productUrl} already exists, updating it.`);
    //     matchingAmazon = await prisma.amazonProduct.findMany({
    //         where: {
    //             product_matches: {
    //                 some: {
    //                     product_id: existingProduct.id
    //                 }
    //             }
    //         }
    //     });
    // } else {
    //     console.log(`Processing product: ${title}`);
    //     const matchingIndexes = await findMatchingAmazonImages(product, amazon_results);
    //     matchingAmazon = matchingIndexes
    //     .filter(index => amazon_results[index] !== undefined) // Exclude undefined entries
    //     .map(index => amazon_results[index]);
    // }
    
    await insertOrUpdateDataToDB(product, matchingAmazon);
    // await analyzeAndUpdateProducts(productUrl);
}
