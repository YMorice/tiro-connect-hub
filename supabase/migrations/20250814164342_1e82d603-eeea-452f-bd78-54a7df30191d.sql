-- Add student_notification_read column to projects table
ALTER TABLE public.projects 
ADD COLUMN student_notification_read BOOLEAN DEFAULT FALSE;

-- Update RLS policy to allow students to update the notification read status
CREATE POLICY "Students can update notification read status" 
ON public.projects 
FOR UPDATE 
USING (selected_student IN (
  SELECT students.id_student 
  FROM students 
  WHERE students.id_user = auth.uid()
))
WITH CHECK (selected_student IN (
  SELECT students.id_student 
  FROM students 
  WHERE students.id_user = auth.uid()
));