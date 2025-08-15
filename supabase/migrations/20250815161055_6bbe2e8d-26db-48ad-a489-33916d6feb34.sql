-- Create security definer function to check if user is project owner
CREATE OR REPLACE FUNCTION public.is_project_owner(project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM entrepreneurs e
    JOIN projects p ON e.id_entrepreneur = p.id_entrepreneur
    WHERE p.id_project = project_id 
    AND e.id_user = auth.uid()
  );
END;
$$;

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Read own projects or if admin" ON public.projects;
DROP POLICY IF EXISTS "Update own project or if admin" ON public.projects;
DROP POLICY IF EXISTS "Insert own project or if admin" ON public.projects;

-- Create new policies using the security definer function
CREATE POLICY "Entrepreneurs can read their projects or admin can read all" 
ON public.projects 
FOR SELECT 
USING (is_admin() OR is_project_owner(id_project));

CREATE POLICY "Entrepreneurs can update their projects or admin can update all" 
ON public.projects 
FOR UPDATE 
USING (is_admin() OR is_project_owner(id_project))
WITH CHECK (is_admin() OR is_project_owner(id_project));

CREATE POLICY "Entrepreneurs can insert projects or admin can insert" 
ON public.projects 
FOR INSERT 
WITH CHECK (is_admin() OR is_project_owner(id_project));