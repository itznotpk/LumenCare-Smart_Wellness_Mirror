-- ==============================================================================
-- LUMENCARE: ADD media_type COLUMN TO daily_drops TABLE
-- Run this in the Supabase SQL Editor.
-- This lets the mirror distinguish between image and video Daily Drops.
-- ==============================================================================

-- Add the media_type column (defaults to 'image' for backward compatibility)
ALTER TABLE public.daily_drops
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- Add a comment for documentation
COMMENT ON COLUMN public.daily_drops.media_type IS 'Type of media: image, video, or text';
