-- Create personal_documents table
CREATE TABLE public.personal_documents (
  id_document UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_user UUID NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in the personal-documents bucket
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.personal_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for personal_documents table
CREATE POLICY "Users can view their own personal documents" 
ON public.personal_documents 
FOR SELECT 
USING (auth.uid() = id_user);

CREATE POLICY "Users can insert their own personal documents" 
ON public.personal_documents 
FOR INSERT 
WITH CHECK (auth.uid() = id_user);

CREATE POLICY "Users can update their own personal documents" 
ON public.personal_documents 
FOR UPDATE 
USING (auth.uid() = id_user)
WITH CHECK (auth.uid() = id_user);

CREATE POLICY "Users can delete their own personal documents" 
ON public.personal_documents 
FOR DELETE 
USING (auth.uid() = id_user);

-- Allow admins to view all personal documents
CREATE POLICY "Admins can view all personal documents" 
ON public.personal_documents 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id_users = auth.uid() 
  AND users.role = 'admin'::user_role
));

-- Allow admins to insert personal documents for any user
CREATE POLICY "Admins can insert personal documents for any user" 
ON public.personal_documents 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id_users = auth.uid() 
  AND users.role = 'admin'::user_role
));

-- Allow admins to update any personal documents
CREATE POLICY "Admins can update any personal documents" 
ON public.personal_documents 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id_users = auth.uid() 
  AND users.role = 'admin'::user_role
));

-- Allow admins to delete any personal documents
CREATE POLICY "Admins can delete any personal documents" 
ON public.personal_documents 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id_users = auth.uid() 
  AND users.role = 'admin'::user_role
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_personal_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_personal_documents_updated_at
  BEFORE UPDATE ON public.personal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_personal_documents_updated_at();

-- Create additional RLS policies for the personal-documents storage bucket
-- Users can view their own files in personal-documents bucket
CREATE POLICY "Users can view their own personal documents in storage" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'personal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can insert their own files in personal-documents bucket
CREATE POLICY "Users can upload their own personal documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'personal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files in personal-documents bucket
CREATE POLICY "Users can update their own personal documents in storage" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'personal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files in personal-documents bucket
CREATE POLICY "Users can delete their own personal documents in storage" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'personal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can manage all files in personal-documents bucket
CREATE POLICY "Admins can manage all personal documents in storage" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'personal-documents' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id_users = auth.uid() 
    AND users.role = 'admin'::user_role
  )
);