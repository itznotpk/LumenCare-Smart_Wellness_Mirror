-- ==============================================================================
-- LUMENCARE: SUPABASE AUTHENTICATION SCHEMA
-- Paste this entire file into the Supabase SQL Editor and hit "Run".
-- ==============================================================================

-- 1. Create the custom Profiles table in the public schema
-- This table automatically links 1-to-1 with Supabase's hidden `auth.users` table.
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  terms_accepted BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Turn on Row Level Security (RLS)
-- This is critical for medical/caregiver apps to ensure data privacy.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Policy A: Users can uniquely read ONLY their own profile data.
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy B: Users can uniquely update ONLY their own profile data.
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 4. Create the automated User-Sync Trigger Function
-- When someone fills out the "Create Account" screen and Supabase authenticates them,
-- this function automatically duplicates their metadata into our public.profiles table.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, terms_accepted)
  VALUES (
    new.id,
    new.email,
    -- We will pass 'full_name' inside the user metadata during the React Native signUp call
    new.raw_user_meta_data->>'full_name',
    -- Mark terms as true since the RegisterScreen requires it to proceed
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach the Trigger to the Supabase Auth system
-- Whenever a new row hits `auth.users` (Account Created), fire the function above.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- DONE! 
-- Your LumenCare Authentication Gateway and database sync is now securely established.
-- ==============================================================================
