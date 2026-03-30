-- ==============================================================================
-- 1. Modify the `vitals` Table
-- ==============================================================================

-- Standardize existing hrv to hrv_sdnn
ALTER TABLE public.vitals RENAME COLUMN hrv TO hrv_sdnn;

-- Add new hrv_rmssd metric
ALTER TABLE public.vitals ADD COLUMN IF NOT EXISTS hrv_rmssd INT4;

-- Add stress_level metric for python hardware injection
ALTER TABLE public.vitals ADD COLUMN IF NOT EXISTS stress_level TEXT;

-- ==============================================================================
-- 2. Modify Wellness Trigger Dependencies (CRITICAL FIX)
-- Since we renamed `hrv`, the existing Database trigger must be pointed to use `hrv_rmssd`
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.compute_vitals_wellness_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hrv_rmssd IS NOT NULL AND NEW.respiratory_rate IS NOT NULL THEN
        NEW.wellness_score := public.calculate_wellness_score(NEW.hrv_rmssd, NEW.respiratory_rate);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_elderly_vitals_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.heart_rate IS NOT NULL AND NEW.hrv_rmssd IS NOT NULL AND NEW.respiratory_rate IS NOT NULL THEN
        UPDATE public.elderlies
        SET 
            wellness_score = NEW.wellness_score,
            recorded_at = NEW.recorded_at
        WHERE id = NEW.elderly_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
