-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin full access" ON public.projects;
DROP POLICY IF EXISTS "Entrepreneurs can manage their projects" ON public.projects;
DROP POLICY IF EXISTS "Students can read projects they're selected for" ON public.projects;
DROP POLICY IF EXISTS "Students can update notification status" ON public.projects;

-- Create secure policies without recursion
CREATE POLICY "Admin full access" 
ON public.projects 
FOR ALL 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Entrepreneurs can manage their projects" 
ON public.projects 
FOR ALL 
TO authenticated
USING (
  id_entrepreneur IN (
    SELECT e.id_entrepreneur 
    FROM entrepreneurs e 
    WHERE e.id_user = auth.uid()
  )
)
WITH CHECK (
  id_entrepreneur IN (
    SELECT e.id_entrepreneur 
    FROM entrepreneurs e 
    WHERE e.id_user = auth.uid()
  )
);

CREATE POLICY "Students can read assigned projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (
  selected_student IN (
    SELECT s.id_student 
    FROM students s 
    WHERE s.id_user = auth.uid()
  )
);

CREATE POLICY "Students can update notification status" 
ON public.projects 
FOR UPDATE 
TO authenticated
USING (
  selected_student IN (
    SELECT s.id_student 
    FROM students s 
    WHERE s.id_user = auth.uid()
  )
)
WITH CHECK (
  selected_student IN (
    SELECT s.id_student 
    FROM students s 
    WHERE s.id_user = auth.uid()
  )
);

CREATE POLICY "Students can read proposed projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM proposed_student ps
    JOIN students s ON ps.student_id = s.id_student
    WHERE ps.project_id = projects.id_project
    AND s.id_user = auth.uid()
  )
);