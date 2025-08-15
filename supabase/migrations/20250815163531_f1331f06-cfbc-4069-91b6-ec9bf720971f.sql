-- Supprimer toutes les policies existantes de projects
DROP POLICY IF EXISTS "Admins have full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Entrepreneurs can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "Students can read assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Students can read proposed projects" ON public.projects;
DROP POLICY IF EXISTS "Students can update notification status" ON public.projects;

-- Créer les nouvelles policies pour projects en utilisant authenticated
CREATE POLICY "Admins have full access to projects"
ON public.projects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id_users = auth.uid() 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id_users = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Entrepreneurs can manage their own projects"
ON public.projects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM entrepreneurs 
    WHERE entrepreneurs.id_entrepreneur = projects.id_entrepreneur 
    AND entrepreneurs.id_user = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM entrepreneurs 
    WHERE entrepreneurs.id_entrepreneur = projects.id_entrepreneur 
    AND entrepreneurs.id_user = auth.uid()
  )
);

CREATE POLICY "Students can read assigned projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id_student = projects.selected_student 
    AND students.id_user = auth.uid()
  )
);

CREATE POLICY "Students can read proposed projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN proposal_to_student pts ON pts.id_student = s.id_student
    WHERE pts.id_project = projects.id_project 
    AND s.id_user = auth.uid()
  )
);

CREATE POLICY "Students can update notification status"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id_student = projects.selected_student 
    AND students.id_user = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id_student = projects.selected_student 
    AND students.id_user = auth.uid()
  )
);