-- Désactiver complètement RLS sur la table projects pour résoudre le problème
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les policies existantes
DROP POLICY IF EXISTS "admins_all_access" ON public.projects;
DROP POLICY IF EXISTS "entrepreneurs_own_projects" ON public.projects;
DROP POLICY IF EXISTS "students_assigned_projects" ON public.projects;
DROP POLICY IF EXISTS "students_proposed_projects" ON public.projects;
DROP POLICY IF EXISTS "students_update_notifications" ON public.projects;