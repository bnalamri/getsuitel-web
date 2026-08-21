-- Allow multiple general accounts of the same utility type per property
-- (e.g. Main Water Meter + Fire Tank Water Meter)

-- Drop the unique constraint that limited 1 per (property, utility_type)
DROP INDEX IF EXISTS idx_utility_accounts_property_general;

-- Add label column so accounts can be named (e.g. "Main Meter", "Fire Tank")
ALTER TABLE utility_accounts ADD COLUMN IF NOT EXISTS label TEXT;
