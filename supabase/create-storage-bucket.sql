
-- Create storage bucket for avatars if it doesn't exist
begin
  insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

  -- Define policy to allow anyone to read avatar files
  create policy "Avatar files are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');
  
  -- Define policy to allow authenticated users to upload avatar files
  create policy "Users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
  
  -- Define policy to allow users to update their own avatars
  create policy "Users can update their own avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
end;
