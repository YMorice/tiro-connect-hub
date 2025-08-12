-- Fix RLS policies that reference user_metadata by using secure helpers instead
-- Table: public.projects

-- 1) Replace SELECT policy to avoid reading from request.jwt.claims->user_metadata
DROP POLICY IF EXISTS "Enable read access for admins and related entrepreneurs" ON public.projects;
CREATE POLICY "Enable read access for admins and related entrepreneurs"
ON public.projects
FOR SELECT
USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.entrepreneurs e
    WHERE e.id_entrepreneur = projects.id_entrepreneur
      AND e.id_user = auth.uid()
  )
);

-- 2) Replace UPDATE policy to avoid any reference to user/app metadata in claims
DROP POLICY IF EXISTS "Update own project or if admin" ON public.projects;
CREATE POLICY "Update own project or if admin"
ON public.projects
FOR UPDATE
USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.entrepreneurs e
    WHERE e.id_entrepreneur = projects.id_entrepreneur
      AND e.id_user = auth.uid()
  )
)
WITH CHECK (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.entrepreneurs e
    WHERE e.id_entrepreneur = projects.id_entrepreneur
      AND e.id_user = auth.uid()
  )
);
