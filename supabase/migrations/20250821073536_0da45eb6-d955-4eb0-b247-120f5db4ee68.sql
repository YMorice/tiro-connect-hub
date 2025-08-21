-- Add tip column to projects table
ALTER TABLE public.projects ADD COLUMN tip DECIMAL(10,2) DEFAULT 0;