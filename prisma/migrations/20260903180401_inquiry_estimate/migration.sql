-- Records the estimate exactly as the customer saw it when they pressed send.
-- Stored rather than recomputed, so a later price change cannot rewrite history
-- or contradict the summary that was emailed at the time.

-- AlterTable
ALTER TABLE "inquiries" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NPR',
ADD COLUMN     "estimateSubtotal" DECIMAL(12,2),
ADD COLUMN     "estimateTaxAmount" DECIMAL(12,2),
ADD COLUMN     "estimateTaxRate" DECIMAL(5,2),
ADD COLUMN     "estimateTotal" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "inquiry_items" ADD COLUMN     "lineTotal" DECIMAL(12,2),
ADD COLUMN     "unitPrice" DECIMAL(12,2);
