-- Supabase SQL to create the user_info table
-- Run this in your Supabase SQL Editor

-- Create the user_info table
CREATE TABLE IF NOT EXISTS public.user_info (
  email TEXT PRIMARY KEY,                    -- SignIn email to IIVY using Supabase Authentication
  user_company_info TEXT,                    -- Company info the user wants to share
  gmail_email TEXT,                          -- Gmail address connected for email access
  gmail_token JSONB,                         -- Gmail OAuth tokens (access_token, refresh_token, etc.)
  outlook_email TEXT,                        -- Outlook address connected for email access
  outlook_token JSONB,                       -- Outlook OAuth tokens (access_token, refresh_token, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on gmail_email and outlook_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_info_gmail_email ON public.user_info(gmail_email);
CREATE INDEX IF NOT EXISTS idx_user_info_outlook_email ON public.user_info(outlook_email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_info ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read only their own data
CREATE POLICY "Users can view their own user_info" ON public.user_info
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- Create policy to allow users to insert their own data
CREATE POLICY "Users can insert their own user_info" ON public.user_info
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update their own user_info" ON public.user_info
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row update
DROP TRIGGER IF EXISTS on_user_info_updated ON public.user_info;
CREATE TRIGGER on_user_info_updated
  BEFORE UPDATE ON public.user_info
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions to authenticated users
GRANT ALL ON public.user_info TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
