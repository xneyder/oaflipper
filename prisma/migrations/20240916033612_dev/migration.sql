/*
  Warnings:

  - You are about to drop the column `promotionText` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "promotionText" TEXT;

-- AlterTable
ALTER TABLE "public"."profiles" DROP COLUMN "promotionText";
