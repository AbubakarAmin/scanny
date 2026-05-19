-- Supabase Table Schema Setup Script
-- Paste this script into your Supabase SQL Editor to create the tickets table and configure RLS policies.

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    class TEXT NOT NULL,
    roll_no TEXT NOT NULL,
    ticket_number TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    checked_in BOOLEAN DEFAULT false NOT NULL,
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT,
    checked_out BOOLEAN DEFAULT false NOT NULL,
    checked_out_at TIMESTAMPTZ,
    checked_out_by TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for the tickets table
ALTER publication supabase_realtime ADD TABLE public.tickets;

-- Create Policies to allow authenticated user operations

CREATE POLICY "Allow authenticated read access" 
ON public.tickets FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated insert access" 
ON public.tickets FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" 
ON public.tickets FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);
