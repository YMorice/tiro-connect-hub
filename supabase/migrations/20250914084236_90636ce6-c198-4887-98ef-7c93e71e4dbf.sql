-- Fix duplicate key issue on message_groups: allow multiple rows per group (one per member)
DO $$ BEGIN
  -- Drop unique constraint or index on id_group if it exists
  BEGIN
    ALTER TABLE public.message_groups DROP CONSTRAINT IF EXISTS message_groups_id_group_unique;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  -- Also try dropping an index with that name if it was created as an index
  PERFORM 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'message_groups_id_group_unique';
  IF FOUND THEN
    EXECUTE 'DROP INDEX IF EXISTS public.message_groups_id_group_unique';
  END IF;

  -- Drop existing primary key if it's only on id_group
  BEGIN
    ALTER TABLE public.message_groups DROP CONSTRAINT IF EXISTS message_groups_pkey;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;

  -- Add composite primary key on (id_group, id_user)
  ALTER TABLE public.message_groups
    ADD CONSTRAINT message_groups_pkey PRIMARY KEY (id_group, id_user);

  -- Helpful indexes
  CREATE INDEX IF NOT EXISTS idx_message_groups_user_project ON public.message_groups (id_user, id_project);
  -- Direct conversations fast lookup (kept from earlier change)
  CREATE INDEX IF NOT EXISTS idx_message_groups_direct ON public.message_groups (id_group, id_user) WHERE id_project IS NULL;
END $$;

-- Update functions to use the correct ON CONFLICT target (id_group, id_user)
CREATE OR REPLACE FUNCTION public.create_project_message_group()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.add_student_to_message_group()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;