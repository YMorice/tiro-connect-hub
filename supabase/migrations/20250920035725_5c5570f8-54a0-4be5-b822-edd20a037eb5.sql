-- 1) Unique constraint matching ON CONFLICT usage for message_groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'ux_message_groups_group_user'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX ux_message_groups_group_user ON public.message_groups (id_group, id_user)';
  END IF;
END $$;

-- 2) Update functions to use the correct conflict target (id_group, id_user)
CREATE OR REPLACE FUNCTION public.create_project_message_group()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  group_id uuid;
  entrepreneur_user_id uuid;
BEGIN
  -- Generate a unique group ID
  group_id := gen_random_uuid();
  
  -- Get the entrepreneur's user ID
  SELECT e.id_user INTO entrepreneur_user_id
  FROM public.entrepreneurs e
  WHERE e.id_entrepreneur = NEW.id_entrepreneur;
  
  -- Create the initial message group entry for the entrepreneur
  INSERT INTO public.message_groups (id_group, id_project, id_user)
  VALUES (group_id, NEW.id_project, entrepreneur_user_id)
  ON CONFLICT (id_group, id_user) DO NOTHING;
  
  -- Add all admin users to the same group
  INSERT INTO public.message_groups (id_group, id_project, id_user)
  SELECT group_id, NEW.id_project, u.id_users
  FROM public.users u 
  WHERE u.role = 'admin'
  ON CONFLICT (id_group, id_user) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_student_to_message_group()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  group_id uuid;
BEGIN
  -- Find the message group for this project
  SELECT mg.id_group INTO group_id
  FROM public.message_groups mg
  WHERE mg.id_project = NEW.id_project
  LIMIT 1;
  
  -- Add the student to the project's message group
  IF group_id IS NOT NULL THEN
    INSERT INTO public.message_groups (id_group, id_user, id_project)
    SELECT group_id, s.id_user, NEW.id_project
    FROM public.students s
    WHERE s.id_student = NEW.id_student
    ON CONFLICT (id_group, id_user) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3) (Re)create trigger to auto-create message group on project insert
DROP TRIGGER IF EXISTS trg_create_project_message_group ON public.projects;
CREATE TRIGGER trg_create_project_message_group
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.create_project_message_group();