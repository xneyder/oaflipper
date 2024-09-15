import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { insertOrUpdateDataToDB, analyzeAndUpdateProducts } from '../../../helpers/db';
import { findMatchingAmazonImages } from '../../../helpers/openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data } = await supabase.auth.getSession();
    const { session } = data;
    
    if (!session) {
        // Not Signed in
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    
    if (req.method !== 'POST') {
        return NextResponse.json(405).json({ message: 'Method not allowed' });
    }
    
    const { product, amazon_results } = req.body;
    
    if (!product || !amazon_results) {
        return NextResponse.json(400).json({ message: 'Invalid request, missing product or amazon_results' });
    }
    
    try {
        // Call the processProduct function
        await processProduct(product, amazon_results);
        NextResponse.json(200).json({ message: 'Product processed successfully' });
    } catch (error) {
        console.error("Error processing product:", error);
        NextResponse.json(500).json({ message: 'Internal Server Error' });
    }
}

async function processProduct(product, amazon_results) {
    const productUrl = product.product_url;
    const title = product.title;
    
    // Look for the existing product in the database
    const existingProduct = await prisma.product.findUnique({
        where: { product_url: productUrl }
    });
    
    let matchingAmazon;
    
    if (existingProduct) {
        console.log(`Product with URL ${productUrl} already exists, updating it.`);
        matchingAmazon = await prisma.amazonProduct.findMany({
            where: {
                product_matches: {
                    some: {
                        product_id: existingProduct.id
                    }
                }
            }
        });
    } else {
        console.log(`Processing product: ${title}`);
        const matchingIndexes = await findMatchingAmazonImages(product, amazon_results);
        matchingAmazon = matchingIndexes.map(index => amazon_results[index]);
        
    }
    await insertOrUpdateDataToDB(product, matchingAmazon);
    console.log(`Inserted product: ${title}`);
    await analyzeAndUpdateProducts(productUrl);
}
