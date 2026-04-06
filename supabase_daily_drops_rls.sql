-- ==============================================================================
-- CardioMira: DAILY DROPS & MIRROR REACTIONS — RLS POLICIES
-- Run this in the Supabase SQL Editor to unlock Daily Drop functionality.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. DAILY_DROPS TABLE — ROW LEVEL SECURITY POLICIES
-- ──────────────────────────────────────────────────────────────────────────────

-- Enable RLS on daily_drops (may already be enabled)
ALTER TABLE public.daily_drops ENABLE ROW LEVEL SECURITY;

-- Policy: Caregivers can INSERT daily drops for their own elderlies
CREATE POLICY "Caregivers can insert daily drops for their elderlies"
ON public.daily_drops
FOR INSERT
WITH CHECK (
  auth.uid() = caregiver_id
  AND EXISTS (
    SELECT 1 FROM public.elderlies
    WHERE elderlies.id = daily_drops.elderly_id
    AND elderlies.caregiver_id = auth.uid()
  )
);

-- Policy: Caregivers can SELECT (view) daily drops they sent
CREATE POLICY "Caregivers can view their own daily drops"
ON public.daily_drops
FOR SELECT
USING (
  auth.uid() = caregiver_id
);

-- Policy: Caregivers can UPDATE daily drops they sent (e.g. edit message)
CREATE POLICY "Caregivers can update their own daily drops"
ON public.daily_drops
FOR UPDATE
USING (
  auth.uid() = caregiver_id
);

-- Policy: Caregivers can DELETE daily drops they sent
CREATE POLICY "Caregivers can delete their own daily drops"
ON public.daily_drops
FOR DELETE
USING (
  auth.uid() = caregiver_id
);


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. MIRROR_REACTIONS TABLE — ROW LEVEL SECURITY POLICIES
-- ──────────────────────────────────────────────────────────────────────────────

-- Enable RLS on mirror_reactions (may already be enabled)
ALTER TABLE public.mirror_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Caregivers can view reactions from their own elderlies
CREATE POLICY "Caregivers can view reactions from their elderlies"
ON public.mirror_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elderlies
    WHERE elderlies.id = mirror_reactions.elderly_id
    AND elderlies.caregiver_id = auth.uid()
  )
);

-- Policy: Allow inserting reactions (this would typically be done by the mirror device,
-- but we allow it for the caregiver's elderlies too for testing)
CREATE POLICY "Allow insert reactions for owned elderlies"
ON public.mirror_reactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.elderlies
    WHERE elderlies.id = mirror_reactions.elderly_id
    AND elderlies.caregiver_id = auth.uid()
  )
);

-- Policy: Caregivers can update reactions (e.g. mark as read)
CREATE POLICY "Caregivers can update reactions for their elderlies"
ON public.mirror_reactions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.elderlies
    WHERE elderlies.id = mirror_reactions.elderly_id
    AND elderlies.caregiver_id = auth.uid()
  )
);


-- ──────────────────────────────────────────────────────────────────────────────
-- 3. STORAGE BUCKET POLICIES — daily_drops
-- Run these to allow authenticated users to upload/read images.
-- NOTE: These use the Supabase storage.objects system table.
-- ──────────────────────────────────────────────────────────────────────────────

-- Allow caregivers to upload files ONLY for their own elderlies
CREATE POLICY "Caregivers can upload drops for their elderlies"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'daily_drops' AND
  (path_tokens)[1]::uuid IN (
    SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
  )
);

-- Allow caregivers to read/view files ONLY for their own elderlies
CREATE POLICY "Caregivers can read drops of their elderlies"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'daily_drops' AND
  (path_tokens)[1]::uuid IN (
    SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
  )
);

-- Allow caregivers to update files ONLY for their own elderlies
CREATE POLICY "Caregivers can update drops of their elderlies"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'daily_drops' AND
  (path_tokens)[1]::uuid IN (
    SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
  )
);

-- Allow caregivers to delete files ONLY for their own elderlies
CREATE POLICY "Caregivers can delete drops of their elderlies"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'daily_drops' AND
  (path_tokens)[1]::uuid IN (
    SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
  )
);
