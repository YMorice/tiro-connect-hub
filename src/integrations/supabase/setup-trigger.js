
// This file contains the database trigger setup for Supabase
// You can run this code manually in the Supabase SQL editor

/*
-- Create enum for user roles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('student', 'entrepreneur', 'admin');
  END IF;
END $$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  role_value public.user_role;
BEGIN
  -- Log the trigger execution for debugging
  RAISE NOTICE 'Trigger fired for user ID: %', NEW.id;
  
  -- Parse the role from user metadata
  role_value := (NEW.raw_user_meta_data->>'role')::public.user_role;

  -- Insert into the users table
  INSERT INTO public.users (
    id_users,
    email,
    name,
    surname,
    bio
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'surname',
    NEW.raw_user_meta_data->>'about'
  );

  -- Based on role, insert into the appropriate role table
  IF role_value = 'student' THEN
    INSERT INTO public.students (
      id_user,
      skills,
      specialty,
      portfoliolink,
      phone,
      address
    ) VALUES (
      NEW.id,
      string_to_array(NEW.raw_user_meta_data->>'skills', ','),
      NEW.raw_user_meta_data->>'specialty',
      NEW.raw_user_meta_data->>'portfolioLink',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address'
    );
  ELSIF role_value = 'entrepreneur' THEN
    INSERT INTO public.entrepreneurs (
      id_user,
      companyname,
      companyrole,
      siret,
      iban,
      projectname,
      projectdescription,
      projectdeadline,
      phone,
      address
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'companyName',
      NEW.raw_user_meta_data->>'companyRole',
      NEW.raw_user_meta_data->>'siret',
      NEW.raw_user_meta_data->>'iban',
      NEW.raw_user_meta_data->>'projectName',
      NEW.raw_user_meta_data->>'projectDescription',
      (NEW.raw_user_meta_data->>'projectDeadline')::date,
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to call function on new user insertion
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/
