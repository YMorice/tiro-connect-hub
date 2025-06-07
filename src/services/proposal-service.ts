
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export const sendProposalToStudent = async (projectId: string, studentId: string) => {
  try {
    console.log('Sending proposal to student:', { projectId, studentId });
    
    // Check if proposal already exists
    const { data: existingProposal, error: checkError } = await supabase
      .from('proposal_to_student')
      .select('*')
      .eq('id_project', projectId)
      .eq('id_student', studentId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing proposal:', checkError);
      throw checkError;
    }
    
    if (existingProposal) {
      toast.error('Proposal already sent to this student');
      return false;
    }
    
    // Create new proposal
    const { error } = await supabase
      .from('proposal_to_student')
      .insert({
        id_project: projectId,
        id_student: studentId,
        accepted: null // null means pending
      });
    
    if (error) {
      console.error('Error sending proposal:', error);
      throw error;
    }
    
    toast.success('Proposal sent to student');
    return true;
  } catch (error) {
    console.error('Error in sendProposalToStudent:', error);
    toast.error('Failed to send proposal');
    return false;
  }
};

export const getStudentProposals = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('proposal_to_student')
      .select(`
        *,
        projects!inner (
          id_project,
          title,
          description,
          deadline,
          price,
          entrepreneurs!inner (
            users!inner (
              name,
              surname
            )
          )
        )
      `)
      .eq('id_student', studentId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching student proposals:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getStudentProposals:', error);
    return [];
  }
};
