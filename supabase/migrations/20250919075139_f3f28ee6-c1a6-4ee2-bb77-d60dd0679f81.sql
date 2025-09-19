-- Create project_services table for many-to-many relationship
CREATE TABLE public.project_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  service_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, service_id)
);

-- Enable RLS
ALTER TABLE public.project_services ENABLE ROW LEVEL SECURITY;

-- Create policies for project_services
CREATE POLICY "Project members can read project services"
ON public.project_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id_project = project_services.project_id
    AND (
      p.id_entrepreneur IN (
        SELECT entrepreneurs.id_entrepreneur
        FROM entrepreneurs
        WHERE entrepreneurs.id_user = auth.uid()
      )
      OR p.selected_student IN (
        SELECT students.id_student
        FROM students
        WHERE students.id_user = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM proposed_student ps
        JOIN students s ON ps.student_id = s.id_student
        WHERE ps.project_id = p.id_project AND s.id_user = auth.uid()
      )
    )
  )
);

CREATE POLICY "Project members can insert project services"
ON public.project_services
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id_project = project_services.project_id
    AND (
      p.id_entrepreneur IN (
        SELECT entrepreneurs.id_entrepreneur
        FROM entrepreneurs
        WHERE entrepreneurs.id_user = auth.uid()
      )
      OR p.selected_student IN (
        SELECT students.id_student
        FROM students
        WHERE students.id_user = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM proposed_student ps
        JOIN students s ON ps.student_id = s.id_student
        WHERE ps.project_id = p.id_project AND s.id_user = auth.uid()
      )
    )
  )
);

CREATE POLICY "Project members can update project services"
ON public.project_services
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id_project = project_services.project_id
    AND (
      p.id_entrepreneur IN (
        SELECT entrepreneurs.id_entrepreneur
        FROM entrepreneurs
        WHERE entrepreneurs.id_user = auth.uid()
      )
      OR p.selected_student IN (
        SELECT students.id_student
        FROM students
        WHERE students.id_user = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM proposed_student ps
        JOIN students s ON ps.student_id = s.id_student
        WHERE ps.project_id = p.id_project AND s.id_user = auth.uid()
      )
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id_project = project_services.project_id
    AND (
      p.id_entrepreneur IN (
        SELECT entrepreneurs.id_entrepreneur
        FROM entrepreneurs
        WHERE entrepreneurs.id_user = auth.uid()
      )
      OR p.selected_student IN (
        SELECT students.id_student
        FROM students
        WHERE students.id_user = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM proposed_student ps
        JOIN students s ON ps.student_id = s.id_student
        WHERE ps.project_id = p.id_project AND s.id_user = auth.uid()
      )
    )
  )
);

CREATE POLICY "Project members can delete project services"
ON public.project_services
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id_project = project_services.project_id
    AND (
      p.id_entrepreneur IN (
        SELECT entrepreneurs.id_entrepreneur
        FROM entrepreneurs
        WHERE entrepreneurs.id_user = auth.uid()
      )
      OR p.selected_student IN (
        SELECT students.id_student
        FROM students
        WHERE students.id_user = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM proposed_student ps
        JOIN students s ON ps.student_id = s.id_student
        WHERE ps.project_id = p.id_project AND s.id_user = auth.uid()
      )
    )
  )
);

-- Admins can do everything
CREATE POLICY "Admins can manage all project services"
ON public.project_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id_users = auth.uid()
    AND users.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id_users = auth.uid()
    AND users.role = 'admin'
  )
);