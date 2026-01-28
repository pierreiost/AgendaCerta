-- Migration: Add Visual Identity fields to Complex table
-- Adds support for custom branding (colors and logo) per venue

-- Add visual identity columns to complexes table
ALTER TABLE "complexes"
ADD COLUMN IF NOT EXISTS "primary_color" TEXT,
ADD COLUMN IF NOT EXISTS "accent_color" TEXT,
ADD COLUMN IF NOT EXISTS "logo_url" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "complexes"."primary_color" IS 'Primary brand color in hex format (e.g., #10b981)';
COMMENT ON COLUMN "complexes"."accent_color" IS 'Accent/secondary brand color in hex format (e.g., #3b82f6)';
COMMENT ON COLUMN "complexes"."logo_url" IS 'URL to the venue logo stored in Supabase Storage';

-- Create index for faster lookups (optional, for analytics)
CREATE INDEX IF NOT EXISTS "idx_complexes_has_branding" ON "complexes" (("primary_color" IS NOT NULL));
