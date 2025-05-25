
import { supabase } from '@/integrations/supabase/client';

export const getCurrentUserEntrepreneurId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('entrepreneurs')
      .select('id_entrepreneur')
      .eq('id_user', user.id)
      .single();

    return data?.id_entrepreneur || null;
  } catch (error) {
    console.error('Error getting entrepreneur ID:', error);
    return null;
  }
};

export const getCurrentUserStudentId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('students')
      .select('id_student')
      .eq('id_user', user.id)
      .single();

    return data?.id_student || null;
  } catch (error) {
    console.error('Error getting student ID:', error);
    return null;
  }
};
