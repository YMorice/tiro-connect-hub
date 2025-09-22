-- Fix the create_project_message_group function to prevent duplicates
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
  
  -- Create a single message group row (one row per group)
  -- Use ON CONFLICT to prevent duplicates if the function is called multiple times
  INSERT INTO public.message_groups (id_group, id_project, id_user)
  VALUES (group_id, NEW.id_project, entrepreneur_user_id)
  ON CONFLICT (id_project, id_user) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Add unique constraint to prevent duplicate message groups for same project/user
ALTER TABLE public.message_groups 
ADD CONSTRAINT unique_project_user_group 
UNIQUE (id_project, id_user);

-- Re-create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS create_project_message_group_trigger ON public.projects;
CREATE TRIGGER create_project_message_group_trigger
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.create_project_message_group();