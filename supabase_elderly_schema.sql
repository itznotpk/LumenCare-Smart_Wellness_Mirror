-- ==============================================================================
-- LUMENCARE: ELDERLY & CLINICAL DATA SCHEMA
-- Do not run this yet if you are just reviewing.
-- This file defines how a single Caregiver account links to multiple Elderlies
-- and securely silos their private medical/vital data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ELDERLIES (PATIENTS) TABLE
-- Links 1 "Caregiver" (public.profiles) -> to Many "Elderlies"
-- ------------------------------------------------------------------------------
CREATE TABLE public.elderlies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  medical_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for extreme privacy compliance (HIPAA style constraint)
ALTER TABLE public.elderlies ENABLE ROW LEVEL SECURITY;

-- Policy: Caregivers can only see and manage elderlies directly tied to their own account.
CREATE POLICY "Caregivers manage their own elderlies" 
ON public.elderlies 
FOR ALL 
USING (auth.uid() = caregiver_id);


-- ------------------------------------------------------------------------------
-- 2. DAILY VITALS TABLE
-- Links 1 "Elderly" -> to Many "Vitals" records (for your Dashboard & Trends)
-- ------------------------------------------------------------------------------
CREATE TABLE public.vitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_id UUID REFERENCES public.elderlies(id) ON DELETE CASCADE NOT NULL,
  
  heart_rate INTEGER,     -- BPM
  hrv INTEGER,            -- Heart Rate Variability (ms)
  respiratory_rate INTEGER, -- Breaths per minute
  
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

-- Policy: Caregivers can only view vitals of elderlies they explicitly own.
-- This requires checking the 'elderlies' table for the matching caregiver_id.
CREATE POLICY "Caregivers view vitals of their elderlies" 
ON public.vitals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.elderlies 
    WHERE elderlies.id = vitals.elderly_id 
    AND elderlies.caregiver_id = auth.uid()
  )
);

CREATE POLICY "Caregivers can insert vitals for their elderlies" 
ON public.vitals 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.elderlies 
    WHERE elderlies.id = vitals.elderly_id 
    AND elderlies.caregiver_id = auth.uid()
  )
);


-- ------------------------------------------------------------------------------
-- 3. SAFETY ALERTS TABLE
-- Links 1 "Elderly" -> to Many "Alerts" (for the red SOS / Safety tab)
-- ------------------------------------------------------------------------------
CREATE TABLE public.safety_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_id UUID REFERENCES public.elderlies(id) ON DELETE CASCADE NOT NULL,
  
  alert_type TEXT NOT NULL,      -- e.g., 'Irregular_HR', 'Fall_Detected', 'Missed_Checkin'
  severity TEXT NOT NULL,        -- 'High', 'Medium', 'Low'
  is_resolved BOOLEAN DEFAULT false,
  message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Caregivers can only view alerts of elderlies they explicitly own.
CREATE POLICY "Caregivers view alerts of their elderlies" 
ON public.safety_alerts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.elderlies 
    WHERE elderlies.id = safety_alerts.elderly_id 
    AND elderlies.caregiver_id = auth.uid()
  )
);

CREATE POLICY "Caregivers can resolve alerts for their elderlies" 
ON public.safety_alerts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.elderlies 
    WHERE elderlies.id = safety_alerts.elderly_id 
    AND elderlies.caregiver_id = auth.uid()
  )
);


-- ------------------------------------------------------------------------------
-- 4. AUTOMATED UPDATED_AT TRIGGER
-- Automatically stamp the updated_at column whenever an elderly profile is edited.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_elderlies_updated_at
BEFORE UPDATE ON public.elderlies
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
