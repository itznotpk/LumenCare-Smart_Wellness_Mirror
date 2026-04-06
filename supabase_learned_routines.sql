-- ==============================================================================
-- CardioMira: LEARNED ROUTINES — AI-Detected Behavioral Patterns
-- Run this in your Supabase SQL Editor.
-- Creates the learned_routines table, RLS, and auto-seed trigger.
-- ==============================================================================


-- ==============================================================================
-- 1. CREATE THE LEARNED_ROUTINES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.learned_routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_id UUID NOT NULL REFERENCES public.elderlies(id) ON DELETE CASCADE,

  routine_name TEXT NOT NULL,           -- 'Morning Wake', 'Nighttime Bed'
  description TEXT,                     -- 'Expected morning activity window'
  icon TEXT DEFAULT 'sun',              -- Feather icon name for the UI

  expected_start TIME NOT NULL,         -- e.g., '07:30:00'
  expected_end TIME NOT NULL,           -- e.g., '08:30:00'
  period TEXT DEFAULT 'AM',             -- Display suffix: 'AM' or 'PM'

  confidence FLOAT DEFAULT 0.5,         -- 0.0 to 1.0, how confident the pattern is
  is_active BOOLEAN DEFAULT TRUE,       -- Toggle routines on/off

  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 2. ROW LEVEL SECURITY
-- ==============================================================================
ALTER TABLE public.learned_routines ENABLE ROW LEVEL SECURITY;

-- Caregivers can view routines of their elderlies
CREATE POLICY "Caregivers can view routines of their elderlies"
ON public.learned_routines
FOR SELECT
USING (
  elderly_id IN (
    SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
  )
);

-- Caregivers can update routines (e.g., adjust times manually)
CREATE POLICY "Caregivers can update routines of their elderlies"
ON public.learned_routines
FOR UPDATE
USING (
  elderly_id IN (
    SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
  )
);

-- Allow system (SECURITY DEFINER triggers) to insert
CREATE POLICY "System can insert learned routines"
ON public.learned_routines
FOR INSERT
WITH CHECK (true);


-- ==============================================================================
-- 3. AUTO-SEED: Create default routines when a new elderly is registered
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.seed_default_routines()
RETURNS TRIGGER AS $$
BEGIN
  -- Morning Wake Window
  INSERT INTO public.learned_routines (
    elderly_id, routine_name, description, icon,
    expected_start, expected_end, period, confidence
  ) VALUES (
    NEW.id,
    'Morning Wake Window',
    'Expected morning activity between:',
    'sun',
    '07:30:00', '08:30:00', 'AM', 0.5
  );

  -- Nighttime Bed Routine
  INSERT INTO public.learned_routines (
    elderly_id, routine_name, description, icon,
    expected_start, expected_end, period, confidence
  ) VALUES (
    NEW.id,
    'Nighttime Bed Routine',
    'Detected resting and settling between:',
    'moon',
    '22:00:00', '23:30:00', 'PM', 0.5
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_elderly_seed_routines ON public.elderlies;
CREATE TRIGGER on_elderly_seed_routines
AFTER INSERT ON public.elderlies
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_routines();


-- ==============================================================================
-- 4. RECOMPUTE ROUTINES: Analyze vitals timestamps to learn actual patterns
--    This function can be called manually or via a cron/Edge Function.
--    It looks at the last 14 days of vitals scans and computes the average
--    earliest and latest scan times to refine the routine windows.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.recompute_routines(target_elderly_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_morning_start TIME;
  avg_morning_end TIME;
  avg_night_start TIME;
  avg_night_end TIME;
  morning_count INT;
  night_count INT;
  morning_confidence FLOAT;
  night_confidence FLOAT;
BEGIN
  -- ── Morning: scans between 5:00 and 11:00 ──
  SELECT
    (MIN(recorded_at::time) - INTERVAL '15 minutes')::time,
    (MAX(recorded_at::time) + INTERVAL '15 minutes')::time,
    COUNT(*)
  INTO avg_morning_start, avg_morning_end, morning_count
  FROM public.vitals
  WHERE elderly_id = target_elderly_id
    AND heart_rate IS NOT NULL
    AND recorded_at >= NOW() - INTERVAL '14 days'
    AND EXTRACT(HOUR FROM recorded_at) BETWEEN 5 AND 10;

  -- ── Nighttime: scans between 20:00 and 23:59 ──
  SELECT
    (MIN(recorded_at::time) - INTERVAL '15 minutes')::time,
    (MAX(recorded_at::time) + INTERVAL '15 minutes')::time,
    COUNT(*)
  INTO avg_night_start, avg_night_end, night_count
  FROM public.vitals
  WHERE elderly_id = target_elderly_id
    AND heart_rate IS NOT NULL
    AND recorded_at >= NOW() - INTERVAL '14 days'
    AND EXTRACT(HOUR FROM recorded_at) BETWEEN 20 AND 23;

  -- Confidence: more data points = higher confidence (cap at 1.0)
  morning_confidence := LEAST(1.0, morning_count::FLOAT / 14.0);
  night_confidence := LEAST(1.0, night_count::FLOAT / 14.0);

  -- Update morning routine if we have data
  IF morning_count >= 3 AND avg_morning_start IS NOT NULL THEN
    UPDATE public.learned_routines
    SET
      expected_start = avg_morning_start,
      expected_end = avg_morning_end,
      confidence = morning_confidence,
      last_computed_at = NOW()
    WHERE elderly_id = target_elderly_id
      AND routine_name = 'Morning Wake Window';
  END IF;

  -- Update nighttime routine if we have data
  IF night_count >= 3 AND avg_night_start IS NOT NULL THEN
    UPDATE public.learned_routines
    SET
      expected_start = avg_night_start,
      expected_end = avg_night_end,
      confidence = night_confidence,
      last_computed_at = NOW()
    WHERE elderly_id = target_elderly_id
      AND routine_name = 'Nighttime Bed Routine';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 5. BACKFILL: Seed routines for any existing elderlies that don't have them yet
-- ==============================================================================
INSERT INTO public.learned_routines (elderly_id, routine_name, description, icon, expected_start, expected_end, period, confidence)
SELECT e.id, 'Morning Wake Window', 'Expected morning activity between:', 'sun', '07:30:00', '08:30:00', 'AM', 0.5
FROM public.elderlies e
WHERE NOT EXISTS (
  SELECT 1 FROM public.learned_routines lr
  WHERE lr.elderly_id = e.id AND lr.routine_name = 'Morning Wake Window'
);

INSERT INTO public.learned_routines (elderly_id, routine_name, description, icon, expected_start, expected_end, period, confidence)
SELECT e.id, 'Nighttime Bed Routine', 'Detected resting and settling between:', 'moon', '22:00:00', '23:30:00', 'PM', 0.5
FROM public.elderlies e
WHERE NOT EXISTS (
  SELECT 1 FROM public.learned_routines lr
  WHERE lr.elderly_id = e.id AND lr.routine_name = 'Nighttime Bed Routine'
);


-- ==============================================================================
-- 6. OPTIONAL: Run recompute for all existing elderlies to learn from past data
--    (Only useful if you already have vitals history)
-- ==============================================================================
DO $$
DECLARE
  eld RECORD;
BEGIN
  FOR eld IN SELECT id FROM public.elderlies LOOP
    PERFORM public.recompute_routines(eld.id);
  END LOOP;
END $$;
