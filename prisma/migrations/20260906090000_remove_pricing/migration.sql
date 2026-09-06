-- Prices leave the catalogue entirely.
--
-- The business quotes on request rather than publishing a figure, so a price
-- is not something this platform holds any longer: not on a product, not on an
-- option, not on the line of an inquiry, and not as an estimate stored against
-- the inquiry itself. Quotation documents go with them, since a quotation is a
-- priced document and nothing else.
--
-- This drops recorded figures. It is deliberate: leaving a column nobody can
-- fill and nobody can read is worse than removing it, and an inquiry that once
-- carried an estimate must not be able to show one now that the site never
-- quotes.

DROP TABLE IF EXISTS "quotation_items";
DROP TABLE IF EXISTS "quotations";
DROP TYPE IF EXISTS "QuotationStatus";

ALTER TABLE "inquiries"
  DROP COLUMN IF EXISTS "currency",
  DROP COLUMN IF EXISTS "estimateSubtotal",
  DROP COLUMN IF EXISTS "estimateTaxRate",
  DROP COLUMN IF EXISTS "estimateTaxAmount",
  DROP COLUMN IF EXISTS "estimateTotal";

ALTER TABLE "inquiry_items"
  DROP COLUMN IF EXISTS "unitPrice",
  DROP COLUMN IF EXISTS "lineTotal";

ALTER TABLE "product_variants"
  DROP COLUMN IF EXISTS "price";

ALTER TABLE "products"
  DROP COLUMN IF EXISTS "basePrice",
  DROP COLUMN IF EXISTS "currency";
