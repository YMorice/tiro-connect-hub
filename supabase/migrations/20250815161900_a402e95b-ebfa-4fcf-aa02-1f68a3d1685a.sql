-- Supprimer TOUTES les policies existantes sur projects
DROP POLICY IF EXISTS "Admin full access" ON public.projects;
DROP POLICY IF EXISTS "Entrepreneurs can manage their projects" ON public.projects;
DROP POLICY IF EXISTS "Students can read assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Students can update notification status" ON public.projects;
DROP POLICY IF EXISTS "Students can read proposed projects" ON public.projects;

-- Désactiver temporairement RLS pour éviter tout problème
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Créer une policy ultra-simple pour les admins
CREATE POLICY "admins_all_access" 
ON public.projects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id_users = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy simple pour les entrepreneurs - accès à leurs projets seulement
CREATE POLICY "entrepreneurs_own_projects" 
ON public.projects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.entrepreneurs 
    WHERE id_entrepreneur = projects.id_entrepreneur 
    AND id_user = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entrepreneurs 
    WHERE id_entrepreneur = projects.id_entrepreneur 
    AND id_user = auth.uid()
  )
);

-- Policy simple pour les étudiants - lecture des projets assignés
CREATE POLICY "students_assigned_projects" 
ON public.projects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id_student = projects.selected_student 
    AND id_user = auth.uid()
  )
);

-- Policy pour étudiants - lecture des projets proposés
CREATE POLICY "students_proposed_projects" 
ON public.projects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.proposed_student ps
    JOIN public.students s ON ps.student_id = s.id_student
    WHERE ps.project_id = projects.id_project
    AND s.id_user = auth.uid()
  )
);

-- Policy pour étudiants - mise à jour du statut de notification
CREATE POLICY "students_update_notifications" 
ON public.projects 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id_student = projects.selected_student 
    AND id_user = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id_student = projects.selected_student 
    AND id_user = auth.uid()
  )
);