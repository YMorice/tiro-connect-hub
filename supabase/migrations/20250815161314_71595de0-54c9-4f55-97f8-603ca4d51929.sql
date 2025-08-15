-- Drop all existing policies on projects table to avoid conflicts
DROP POLICY IF EXISTS "Entrepreneurs can read their projects or admin can read all" ON public.projects;
DROP POLICY IF EXISTS "Entrepreneurs can update their projects or admin can update all" ON public.projects;
DROP POLICY IF EXISTS "Entrepreneurs can insert projects or admin can insert" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all read" ON public.projects;
DROP POLICY IF EXISTS "Enable read access for admins and related entrepreneurs" ON public.projects;
DROP POLICY IF EXISTS "Students can update notification read status" ON public.projects;
DROP POLICY IF EXISTS "TEMP allow all" ON public.projects;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);

-- Create simple, non-recursive policies
CREATE POLICY "Admin full access" 
ON public.projects 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Entrepreneurs can manage their projects" 
ON public.projects 
FOR ALL 
USING (
  id_entrepreneur IN (
    SELECT id_entrepreneur 
    FROM entrepreneurs 
    WHERE id_user = auth.uid()
  )
)
WITH CHECK (
  id_entrepreneur IN (
    SELECT id_entrepreneur 
    FROM entrepreneurs 
    WHERE id_user = auth.uid()
  )
);

CREATE POLICY "Students can read projects they're selected for" 
ON public.projects 
FOR SELECT 
USING (
  selected_student IN (
    SELECT id_student 
    FROM students 
    WHERE id_user = auth.uid()
  )
);

CREATE POLICY "Students can update notification status" 
ON public.projects 
FOR UPDATE 
USING (
  selected_student IN (
    SELECT id_student 
    FROM students 
    WHERE id_user = auth.uid()
  )
)
WITH CHECK (
  selected_student IN (
    SELECT id_student 
    FROM students 
    WHERE id_user = auth.uid()
  )
);