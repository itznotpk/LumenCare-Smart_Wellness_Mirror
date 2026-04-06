-- ==============================================================================
-- CardioMira: EMERGENCY_CONTACTS
-- Stores real phone numbers for emergency escalation and alerts.
-- ==============================================================================

-- 1. Create the emergency_contacts table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_id UUID NOT NULL REFERENCES public.elderlies(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES auth.users(id),

  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT, -- Son, Daughter, Doctor, etc.
  is_primary BOOLEAN DEFAULT FALSE, -- Escalation tier 1
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- 3. Caregivers can manage their own emergency contacts for their elderlies
CREATE POLICY "Caregivers can view emergency contacts"
ON public.emergency_contacts
FOR SELECT
USING (
    caregiver_id = auth.uid() OR
    elderly_id IN (
      SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
    )
);

CREATE POLICY "Caregivers can insert emergency contacts"
ON public.emergency_contacts
FOR INSERT
WITH CHECK (
    caregiver_id = auth.uid()
);

CREATE POLICY "Caregivers can update emergency contacts"
ON public.emergency_contacts
FOR UPDATE
USING (
    caregiver_id = auth.uid()
);

CREATE POLICY "Caregivers can delete emergency contacts"
ON public.emergency_contacts
FOR DELETE
USING (
    caregiver_id = auth.uid()
);

-- 4. Index for performance
CREATE INDEX idx_emergency_contacts_elderly ON public.emergency_contacts(elderly_id);
