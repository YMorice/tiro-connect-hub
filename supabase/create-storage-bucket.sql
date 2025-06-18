-- Create storage bucket for avatars
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true);
  END IF;

  -- Define policy to allow anyone to read avatar files
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Avatar files are publicly accessible') THEN
    CREATE POLICY "Avatar files are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;
  
  -- Define policy to allow authenticated users to upload avatar files
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload avatars') THEN
    CREATE POLICY "Users can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
  END IF;
  
  -- Define policy to allow users to update their own avatars
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update their own avatars') THEN
    CREATE POLICY "Users can update their own avatars"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Profile pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

-- Create storage bucket for profile pictures
DO $$ 
BEGIN
  -- Create the bucket if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pp') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('pp', 'pp', false);
  END IF;
END $$;

-- Configure policies for profile pictures bucket
DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Profile pictures are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

  -- Create new policies
  CREATE POLICY "Profile pictures are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pp' AND auth.role() = 'authenticated');

  CREATE POLICY "Users can upload profile pictures"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pp' AND auth.role() = 'authenticated');

  CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pp' AND auth.uid()::text = (storage.foldername(name))[1]);

  CREATE POLICY "Users can delete their own profile pictures"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pp' AND auth.uid()::text = (storage.foldername(name))[1]);
END $$;

-- Create storage bucket for documents
DO $$ 
BEGIN
  -- First, ensure the documents bucket exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', false);
  END IF;
END $$;

-- Create storage policies for documents
DO $$ 
BEGIN
  -- Enable RLS on storage.objects if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Define policy to allow project members to read documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Project members can read documents') THEN
    CREATE POLICY "Project members can read documents"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'documents' AND
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id_project::text = (storage.foldername(name))[1]
        AND (
          p.id_entrepreneur::text = auth.uid()::text
          OR p.selected_student::text = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.proposed_student ps
            WHERE ps.project_id::text = p.id_project::text
            AND ps.student_id::text = auth.uid()::text
          )
        )
      )
    );
  END IF;

  -- Define policy to allow project members to upload documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Project members can upload documents') THEN
    CREATE POLICY "Project members can upload documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'documents' AND
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id_project::text = (storage.foldername(name))[1]
        AND (
          p.id_entrepreneur::text = auth.uid()::text
          OR p.selected_student::text = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.proposed_student ps
            WHERE ps.project_id::text = p.id_project::text
            AND ps.student_id::text = auth.uid()::text
          )
        )
      )
    );
  END IF;

  -- Define policy to allow project members to delete documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Project members can delete documents') THEN
    CREATE POLICY "Project members can delete documents"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'documents' AND
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id_project::text = (storage.foldername(name))[1]
        AND (
          p.id_entrepreneur::text = auth.uid()::text
          OR p.selected_student::text = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.proposed_student ps
            WHERE ps.project_id::text = p.id_project::text
            AND ps.student_id::text = auth.uid()::text
          )
        )
      )
    );
  END IF;
END $$;

-- Create policies for documents table
DO $$ 
BEGIN
  -- Enable RLS on documents table if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'documents' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Allow project members to read documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Project members can read documents') THEN
    CREATE POLICY "Project members can read documents"
    ON public.documents FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id_project = documents.id_project
        AND (
          p.id_entrepreneur IN (
            SELECT id_entrepreneur 
            FROM public.entrepreneurs 
            WHERE id_user = auth.uid()
          )
          OR p.selected_student IN (
            SELECT id_student 
            FROM public.students 
            WHERE id_user = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.proposed_student ps
            JOIN public.students s ON ps.student_id = s.id_student
            WHERE ps.project_id = p.id_project
            AND s.id_user = auth.uid()
          )
        )
      )
    );
  END IF;

  -- Allow project members to insert documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Project members can insert documents') THEN
    CREATE POLICY "Project members can insert documents"
    ON public.documents FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id_project = documents.id_project
        AND (
          p.id_entrepreneur IN (
            SELECT id_entrepreneur 
            FROM public.entrepreneurs 
            WHERE id_user = auth.uid()
          )
          OR p.selected_student IN (
            SELECT id_student 
            FROM public.students 
            WHERE id_user = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.proposed_student ps
            JOIN public.students s ON ps.student_id = s.id_student
            WHERE ps.project_id = p.id_project
            AND s.id_user = auth.uid()
          )
        )
      )
    );
  END IF;

  -- Allow project members to delete documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Project members can delete documents') THEN
    CREATE POLICY "Project members can delete documents"
    ON public.documents FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id_project = documents.id_project
        AND (
          p.id_entrepreneur IN (
            SELECT id_entrepreneur 
            FROM public.entrepreneurs 
            WHERE id_user = auth.uid()
          )
          OR p.selected_student IN (
            SELECT id_student 
            FROM public.students 
            WHERE id_user = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.proposed_student ps
            JOIN public.students s ON ps.student_id = s.id_student
            WHERE ps.project_id = p.id_project
            AND s.id_user = auth.uid()
          )
        )
      )
    );
  END IF;
END $$;
