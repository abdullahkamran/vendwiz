-- Add nullable label column to product_option_values for human-readable option names.
-- For colour groups value stores the hex (#FF0000) and label stores the display name ("Red").
-- For other groups (size, etc.) both value and label store the same text (e.g. "M").
-- Existing rows keep label = NULL; display code falls back to value when label is absent.
ALTER TABLE product_option_values ADD COLUMN IF NOT EXISTS label TEXT;
