-- CreateTable
CREATE TABLE "public"."Product" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "image_urls" TEXT[],
    "product_url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "last_seen_price" TEXT,
    "in_stock" BOOLEAN NOT NULL DEFAULT false,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AmazonProduct" (
    "id" SERIAL NOT NULL,
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "product_url" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "amazon_buy_box_count" INTEGER,
    "current_sellers" INTEGER,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmazonProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductMatch" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "amazon_product_id" INTEGER NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_product_url_key" ON "public"."Product"("product_url");

-- CreateIndex
CREATE INDEX "Product_product_url_idx" ON "public"."Product"("product_url");

-- CreateIndex
CREATE UNIQUE INDEX "AmazonProduct_asin_key" ON "public"."AmazonProduct"("asin");

-- CreateIndex
CREATE UNIQUE INDEX "AmazonProduct_product_url_key" ON "public"."AmazonProduct"("product_url");

-- CreateIndex
CREATE INDEX "AmazonProduct_asin_idx" ON "public"."AmazonProduct"("asin");

-- CreateIndex
CREATE INDEX "ProductMatch_product_id_amazon_product_id_idx" ON "public"."ProductMatch"("product_id", "amazon_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMatch_product_id_amazon_product_id_key" ON "public"."ProductMatch"("product_id", "amazon_product_id");

-- AddForeignKey
ALTER TABLE "public"."ProductMatch" ADD CONSTRAINT "ProductMatch_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductMatch" ADD CONSTRAINT "ProductMatch_amazon_product_id_fkey" FOREIGN KEY ("amazon_product_id") REFERENCES "public"."AmazonProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
