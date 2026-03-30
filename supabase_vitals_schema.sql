-- ==============================================================================
-- 1. Modify the `elderlies` Table to host Summary Analytics
-- ==============================================================================
ALTER TABLE public.elderlies ADD COLUMN IF NOT EXISTS wellness_score INT4;
ALTER TABLE public.elderlies ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;

-- ==============================================================================
-- 2. Create the `vitals` Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vitals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    elderly_id UUID NOT NULL REFERENCES public.elderlies(id) ON DELETE CASCADE,
    heart_rate INT4,              -- Allow NULL initially
    hrv INT4,                     -- Allow NULL initially
    respiratory_rate INT4,        -- Allow NULL initially
    wellness_score INT4,          -- Auto-computed via Trigger
    recorded_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.vitals ADD COLUMN IF NOT EXISTS wellness_score INT4;

-- ==============================================================================
-- 3. Enable Row Level Security (RLS) on Vitals
-- ==============================================================================
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caregivers can view vitals of their registered elderlies"
ON public.vitals
FOR SELECT
USING (
    elderly_id IN (
        SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
    )
);

CREATE POLICY "Caregivers can update vitals of their registered elderlies"
ON public.vitals
FOR ALL
USING (
    elderly_id IN (
        SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
    )
);

-- ==============================================================================
-- 4. Initial Null Trigger on Patient Registration
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_initial_vitals_row()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.vitals (
        elderly_id, 
        heart_rate, 
        hrv, 
        respiratory_rate,
        wellness_score,
        recorded_at
    )
    VALUES (
        NEW.id, 
        NULL, 
        NULL, 
        NULL,
        NULL,
        NULL -- No scans recorded yet
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_elderly_created ON public.elderlies;
CREATE TRIGGER on_elderly_created
AFTER INSERT ON public.elderlies
FOR EACH ROW
EXECUTE FUNCTION public.create_initial_vitals_row();

-- ==============================================================================
-- 5. Wellness Score Calculation Function
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.calculate_wellness_score(hrv INT, rr INT)
RETURNS INT AS $$
DECLARE
    rmssd_score FLOAT;
    rr_score FLOAT;
    wellness FLOAT;
BEGIN
    IF hrv IS NULL OR rr IS NULL THEN
        RETURN NULL;
    END IF;

    -- Normalize RMSSD (10 to 100 ms) and Clamp
    rmssd_score := ((hrv - 10)::FLOAT / (100 - 10)::FLOAT) * 100;
    IF rmssd_score < 0 THEN rmssd_score := 0; END IF;
    IF rmssd_score > 100 THEN rmssd_score := 100; END IF;

    -- Normalize RR (ideal 15, tolerance 6) and Clamp
    rr_score := (1 - abs(rr - 15)::FLOAT / 6.0) * 100;
    IF rr_score < 0 THEN rr_score := 0; END IF;
    IF rr_score > 100 THEN rr_score := 100; END IF;

    -- Apply Weights: 60% HRV, 40% Respiratory Rate
    wellness := 0.6 * rmssd_score + 0.4 * rr_score;
    RETURN round(wellness);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==============================================================================
-- 6. Trigger: Auto-compute wellness_score in Vitals table BEFORE save
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.compute_vitals_wellness_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hrv IS NOT NULL AND NEW.respiratory_rate IS NOT NULL THEN
        NEW.wellness_score := public.calculate_wellness_score(NEW.hrv, NEW.respiratory_rate);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_vitals_upsert ON public.vitals;
CREATE TRIGGER before_vitals_upsert
BEFORE INSERT OR UPDATE ON public.vitals
FOR EACH ROW
EXECUTE FUNCTION public.compute_vitals_wellness_score();

-- ==============================================================================
-- 7. Trigger: Sync Vitals overwrite back to Elderlies Payload
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_elderly_vitals_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if all 3 are fully populated
    IF NEW.heart_rate IS NOT NULL AND NEW.hrv IS NOT NULL AND NEW.respiratory_rate IS NOT NULL THEN
        UPDATE public.elderlies
        SET 
            wellness_score = NEW.wellness_score,
            recorded_at = NEW.recorded_at
        WHERE id = NEW.elderly_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_vitals_updated ON public.vitals;
CREATE TRIGGER on_vitals_updated
AFTER UPDATE OR INSERT ON public.vitals
FOR EACH ROW
EXECUTE FUNCTION public.update_elderly_vitals_summary();
