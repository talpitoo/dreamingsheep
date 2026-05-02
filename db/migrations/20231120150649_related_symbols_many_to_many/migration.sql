/*
  Warnings:

  - You are about to drop the column `relatedToId` on the `Symbol` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Symbol" DROP CONSTRAINT "Symbol_relatedToId_fkey";

-- AlterTable
ALTER TABLE "Symbol" DROP COLUMN "relatedToId";

-- CreateTable
CREATE TABLE "_SymbolToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SymbolToUser_AB_unique" ON "_SymbolToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_SymbolToUser_B_index" ON "_SymbolToUser"("B");

-- AddForeignKey
ALTER TABLE "_SymbolToUser" ADD CONSTRAINT "_SymbolToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Symbol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SymbolToUser" ADD CONSTRAINT "_SymbolToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
