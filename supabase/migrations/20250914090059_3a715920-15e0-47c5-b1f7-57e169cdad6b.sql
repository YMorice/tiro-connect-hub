-- Add foreign key constraint between projects and project_packs
ALTER TABLE public.projects 
ADD CONSTRAINT projects_id_pack_fkey 
FOREIGN KEY (id_pack) 
REFERENCES public.project_packs(id_pack);