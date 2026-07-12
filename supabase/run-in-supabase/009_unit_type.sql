-- Migration 009: Add unit_type to units
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'flat';
