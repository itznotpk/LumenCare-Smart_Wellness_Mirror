-- ==============================================================================
-- CardioMira: CARE_CHAT — AI Health Assistant Conversation History
-- Stores interactions between the caregiver and the Cardio IQ AI.
-- ==============================================================================

-- 1. Create the care_chat table
CREATE TABLE IF NOT EXISTS public.care_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elderly_id UUID NOT NULL REFERENCES public.elderlies(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  query TEXT NOT NULL,                -- User's question
  response TEXT,                      -- AI's response (captured from Edge Function/LLM)
  
  -- Session management
  conversation_id UUID DEFAULT gen_random_uuid(), -- Groups messages into a thread
  is_cleared BOOLEAN DEFAULT FALSE,              -- Soft-delete for the UI
  
  -- Metadata for context (e.g., which vitals were shown during the question)
  context_vitals_id UUID REFERENCES public.vitals(id), 
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.care_chat ENABLE ROW LEVEL SECURITY;

-- 3. Caregivers can see their own chat history for their elderlies
CREATE POLICY "Caregivers can view their chat history"
ON public.care_chat
FOR SELECT
USING (
    caregiver_id = auth.uid() OR
    elderly_id IN (
      SELECT id FROM public.elderlies WHERE caregiver_id = auth.uid()
    )
);

-- 4. Caregivers can insert new chat queries
CREATE POLICY "Caregivers can insert new chat questions"
ON public.care_chat
FOR INSERT
WITH CHECK (
    caregiver_id = auth.uid()
);

-- 5. Caregivers can update their own records (mark as cleared)
CREATE POLICY "Caregivers can update their own chat records"
ON public.care_chat
FOR UPDATE
USING (
    caregiver_id = auth.uid()
);

-- 6. Caregivers can delete their own chat records
CREATE POLICY "Caregivers can delete their own chat records"
ON public.care_chat
FOR DELETE
USING (
    caregiver_id = auth.uid()
);

-- 7. System/Edge Functions can update with AI responses
CREATE POLICY "System can update with AI responses"
ON public.care_chat
FOR UPDATE
USING (true);

-- 8. Indices for performance
CREATE INDEX idx_care_chat_elderly ON public.care_chat(elderly_id);
CREATE INDEX idx_care_chat_conversation ON public.care_chat(conversation_id);
CREATE INDEX idx_care_chat_created ON public.care_chat(created_at DESC);
CREATE INDEX idx_care_chat_cleared ON public.care_chat(is_cleared);
