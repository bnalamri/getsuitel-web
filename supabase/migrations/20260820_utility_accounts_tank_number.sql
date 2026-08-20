-- Add tank_number column to utility_accounts (for water utility type)
ALTER TABLE utility_accounts ADD COLUMN IF NOT EXISTS tank_number TEXT;
