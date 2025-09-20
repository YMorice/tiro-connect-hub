-- Simplify message group creation to a single row per group
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
  
  -- Create a single message group row (one row per group)
  INSERT INTO public.message_groups (id_group, id_project, id_user)
  VALUES (group_id, NEW.id_project, entrepreneur_user_id)
  ON CONFLICT (id_group) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Disable adding extra rows for members to avoid unique(id_group) conflicts
CREATE OR REPLACE FUNCTION public.add_student_to_message_group()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- No-op to keep schema stable without inserting extra rows
  RETURN NEW;
END;
$function$;