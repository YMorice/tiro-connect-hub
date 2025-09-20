-- Recreate project_services table to link projects with their selected services
CREATE TABLE public.project_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id_project) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(service_id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, service_id)
);

-- Enable RLS
ALTER TABLE public.project_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_services
CREATE POLICY "Admins can manage all project services" 
ON public.project_services 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id_users = auth.uid() AND users.role = 'admin'::user_role
));

CREATE POLICY "Project owner can manage project services" 
ON public.project_services 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM projects p 
  JOIN entrepreneurs e ON p.id_entrepreneur = e.id_entrepreneur 
  WHERE p.id_project = project_services.project_id 
  AND e.id_user = auth.uid()
));

CREATE POLICY "Students can view project services for their projects" 
ON public.project_services 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id_project = project_services.project_id 
  AND p.selected_student IN (
    SELECT s.id_student FROM students s WHERE s.id_user = auth.uid()
  )
));