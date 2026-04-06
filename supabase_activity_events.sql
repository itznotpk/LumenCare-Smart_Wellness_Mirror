-- ==============================================================================
-- CardioMira: ACTIVITY EVENTS — Unified Activity Timeline
-- Run this in your Supabase SQL Editor.
-- Creates the activity_events table, RLS policies, and 3 auto-populating triggers.
-- ==============================================================================


-- ==============================================================================
-- 1. CREATE THE ACTIVITY_EVENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_id UUID NOT NULL REFERENCES public.elderlies(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,           -- 'scan', 'motion', 'fall', 'media_received', 'settling'
  description TEXT NOT NULL,          -- Human-readable: "Morning vitals scan completed"
  severity TEXT DEFAULT 'normal',     -- 'normal', 'info', 'warning', 'critical'

  source_table TEXT,                  -- 'vitals', 'safety_alerts', 'daily_drops'
  source_id UUID,                     -- The ID of the originating row

  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 2. ROW LEVEL SECURITY
-- ==============================================================================
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caregivers can view activity events of their elderlies"
ON public.activity_events
FOR SELECT
USING (
  elderly_id IN (
    SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
  )
);

-- Allow triggers (SECURITY DEFINER functions) to insert freely
CREATE POLICY "System can insert activity events"
ON public.activity_events
FOR INSERT
WITH CHECK (true);


-- ==============================================================================
-- 3. TRIGGER: Vitals scan → Activity Event
--    Generates a contextual event based on the hour of day.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.log_vitals_as_activity()
RETURNS TRIGGER AS $$
DECLARE
  scan_hour INT;
  event_desc TEXT;
  evt_type TEXT;
BEGIN
  -- Skip the initial null placeholder row created on registration
  IF NEW.heart_rate IS NULL THEN
    RETURN NEW;
  END IF;

  scan_hour := EXTRACT(HOUR FROM COALESCE(NEW.recorded_at, NOW()));

  IF scan_hour BETWEEN 5 AND 11 THEN
    event_desc := 'Morning vitals scan (AM)';
    evt_type := 'scan';
  ELSIF scan_hour BETWEEN 12 AND 16 THEN
    event_desc := 'Afternoon check-in (PM)';
    evt_type := 'scan';
  ELSIF scan_hour BETWEEN 17 AND 21 THEN
    event_desc := 'Evening vitals recorded (PM)';
    evt_type := 'scan';
  ELSE
    event_desc := 'Nighttime activity detected (PM)';
    evt_type := 'motion';
  END IF;

  INSERT INTO public.activity_events (
    elderly_id, event_type, description, severity, source_table, source_id, occurred_at
  ) VALUES (
    NEW.elderly_id, evt_type, event_desc, 'normal', 'vitals', NEW.id,
    COALESCE(NEW.recorded_at, NOW())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_vitals_log_activity ON public.vitals;
CREATE TRIGGER on_vitals_log_activity
AFTER INSERT ON public.vitals
FOR EACH ROW
EXECUTE FUNCTION public.log_vitals_as_activity();


-- ==============================================================================
-- 4. TRIGGER: Safety Alert → Activity Event
--    Logs every alert into the unified timeline with 'critical' severity.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.log_alert_as_activity()
RETURNS TRIGGER AS $$
DECLARE
  event_desc TEXT;
  evt_type TEXT;
BEGIN
  IF NEW.alert_type = 'Fall_Detected' THEN
    event_desc := 'Fall Detected!';
    evt_type := 'fall';
  ELSE
    event_desc := COALESCE(NEW.message, NEW.alert_type);
    evt_type := 'alert';
  END IF;

  INSERT INTO public.activity_events (
    elderly_id, event_type, description, severity, source_table, source_id, occurred_at
  ) VALUES (
    NEW.elderly_id, evt_type, event_desc, 'critical', 'safety_alerts', NEW.id, NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_alert_log_activity ON public.safety_alerts;
CREATE TRIGGER on_alert_log_activity
AFTER INSERT ON public.safety_alerts
FOR EACH ROW
EXECUTE FUNCTION public.log_alert_as_activity();


-- ==============================================================================
-- 5. TRIGGER: Daily Drop → Activity Event
--    Logs when a caregiver sends media to the mirror.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.log_daily_drop_as_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_events (
    elderly_id, event_type, description, severity, source_table, source_id, occurred_at
  ) VALUES (
    NEW.elderly_id, 'media', 'Photo received from caregiver', 'info', 'daily_drops', NEW.id, NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_drop_log_activity ON public.daily_drops;
CREATE TRIGGER on_drop_log_activity
AFTER INSERT ON public.daily_drops
FOR EACH ROW
EXECUTE FUNCTION public.log_daily_drop_as_activity();


-- ==============================================================================
-- 6. OPTIONAL: Backfill existing vitals data into activity_events
--    Run this ONCE to populate the timeline with historical scans.
--    Comment this out if you don't want to backfill.
-- ==============================================================================
INSERT INTO public.activity_events (elderly_id, event_type, description, severity, source_table, source_id, occurred_at)
SELECT
  v.elderly_id,
  CASE
    WHEN EXTRACT(HOUR FROM v.recorded_at) BETWEEN 5 AND 10 THEN 'scan'
    WHEN EXTRACT(HOUR FROM v.recorded_at) BETWEEN 11 AND 16 THEN 'scan'
    WHEN EXTRACT(HOUR FROM v.recorded_at) BETWEEN 17 AND 20 THEN 'scan'
    ELSE 'motion'
  END,
  CASE
    WHEN EXTRACT(HOUR FROM v.recorded_at) BETWEEN 5 AND 11 THEN 'Morning vitals scan (AM)'
    WHEN EXTRACT(HOUR FROM v.recorded_at) BETWEEN 12 AND 16 THEN 'Afternoon check-in (PM)'
    WHEN EXTRACT(HOUR FROM v.recorded_at) BETWEEN 17 AND 21 THEN 'Evening vitals recorded (PM)'
    ELSE 'Nighttime activity detected (PM)'
  END,
  'normal',
  'vitals',
  v.id,
  v.recorded_at
FROM public.vitals v
WHERE v.heart_rate IS NOT NULL
  AND v.recorded_at IS NOT NULL;

-- Backfill existing safety alerts
INSERT INTO public.activity_events (elderly_id, event_type, description, severity, source_table, source_id, occurred_at)
SELECT
  sa.elderly_id,
  CASE WHEN sa.alert_type = 'Fall_Detected' THEN 'fall' ELSE 'alert' END,
  CASE WHEN sa.alert_type = 'Fall_Detected' THEN 'Fall Detected!' ELSE COALESCE(sa.message, sa.alert_type) END,
  'critical',
  'safety_alerts',
  sa.id,
  sa.created_at
FROM public.safety_alerts sa;
