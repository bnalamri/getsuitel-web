-- Migration 008: Add address_line2 to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS address_line2 text;
