-- ==============================================================================
-- 1. Daily Drops Table (Caregiver -> Mirror)
-- Stores the text messages and Supabase Storage image URLs sent to the mirror.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.daily_drops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    caregiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    elderly_id UUID NOT NULL REFERENCES public.elderlies(id) ON DELETE CASCADE,
    message_text TEXT,
    image_url TEXT,           -- The URL generated from your Supabase Storage Bucket
    is_viewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 2. Mirror Reactions Table (Mirror -> Caregiver)
-- Records historical notifications of when the elderly interacts with the mirror.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mirror_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    elderly_id UUID NOT NULL REFERENCES public.elderlies(id) ON DELETE CASCADE,
    reaction_type TEXT,       -- e.g., 'smile', 'wave', 'read', 'sos'
    message TEXT,             -- e.g., 'Grandma smiled at your morning picture!'
    related_drop_id UUID REFERENCES public.daily_drops(id) ON DELETE SET NULL, -- Optional tie to a specific drop
    is_read_by_caregiver BOOLEAN DEFAULT FALSE, -- Did the caregiver check this notification?
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.daily_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mirror_reactions ENABLE ROW LEVEL SECURITY;

-- Caregivers can view drops for their elderlies
CREATE POLICY "Caregivers can view their sent daily drops"
ON public.daily_drops
FOR SELECT
USING (caregiver_id = auth.uid());

-- Caregivers can insert new drops
CREATE POLICY "Caregivers can create daily drops"
ON public.daily_drops
FOR INSERT
WITH CHECK (caregiver_id = auth.uid());

-- Caregivers can view reactions related to their elderlies
CREATE POLICY "Caregivers can view reactions of their registered elderlies"
ON public.mirror_reactions
FOR SELECT
USING (
    elderly_id IN (
        SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
    )
);
