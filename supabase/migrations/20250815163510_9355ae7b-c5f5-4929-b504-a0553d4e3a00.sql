-- Corriger les policies de proposed_student qui créent la récursion infinie
-- Supprimer la policy qui fait référence à projects
DROP POLICY IF EXISTS "Entrepreneur can view proposed students for their projects" ON public.proposed_student;

-- Recréer une policy simple pour proposed_student sans référence à projects
CREATE POLICY "Admins can manage proposed students"
ON public.proposed_student
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Réactiver RLS sur projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Créer les nouvelles policies pour projects en utilisant authenticated
CREATE POLICY "Admins have full access to projects"
ON public.projects
FOR ALL
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