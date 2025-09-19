-- Enable RLS on services table if not already enabled
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read services
CREATE POLICY "Authenticated users can read services" 
ON public.services 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow admins to manage services
CREATE POLICY "Admins can manage services" 
ON public.services 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());