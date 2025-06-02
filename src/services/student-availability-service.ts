
import { supabase } from "@/integrations/supabase/client";

export class StudentAvailabilityService {
  /**
   * When a student is selected for a project (entrepreneur makes final choice)
   * - Set the selected student as unavailable
   * - Set all other proposed students back to available
   */
  static async handleStudentSelection(projectId: string, selectedStudentId: string) {
    try {
      console.log('Handling student selection for project:', projectId, 'selected student:', selectedStudentId);
      
      // Get all students who were proposed for this project
      const { data: proposedStudents, error: fetchError } = await supabase
        .from('proposed_student')
        .select('student_id')
        .eq('project_id', projectId);
        
      if (fetchError) {
        console.error('Error fetching proposed students:', fetchError);
        throw fetchError;
      }
      
      const proposedStudentIds = proposedStudents?.map(p => p.student_id) || [];
      console.log('Proposed student IDs:', proposedStudentIds);
      
      // Set all proposed students (except selected one) back to available
      const studentsToMakeAvailable = proposedStudentIds.filter(id => id !== selectedStudentId);
      
      if (studentsToMakeAvailable.length > 0) {
        const { error: availableError } = await supabase
          .from('students')
          .update({ available: true })
          .in('id_student', studentsToMakeAvailable);
          
        if (availableError) {
          console.error('Error setting students as available:', availableError);
          throw availableError;
        }
        
        console.log('Set students as available:', studentsToMakeAvailable);
      }
      
      // Set the selected student as unavailable
      const { error: unavailableError } = await supabase
        .from('students')
        .update({ available: false })
        .eq('id_student', selectedStudentId);
        
      if (unavailableError) {
        console.error('Error setting selected student as unavailable:', unavailableError);
        throw unavailableError;
      }
      
      console.log('Set selected student as unavailable:', selectedStudentId);
      
      // Update the project with the selected student
      const { error: projectError } = await supabase
        .from('projects')
        .update({ selected_student: selectedStudentId })
        .eq('id_project', projectId);
        
      if (projectError) {
        console.error('Error updating project with selected student:', projectError);
        throw projectError;
      }
      
      console.log('Updated project with selected student');
      
    } catch (error) {
      console.error('Error in handleStudentSelection:', error);
      throw error;
    }
  }
  
  /**
   * When a project is completed/finished
   * - Set the selected student back to available
   */
  static async handleProjectCompletion(projectId: string) {
    try {
      console.log('Handling project completion for project:', projectId);
      
      // Get the selected student for this project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('selected_student')
        .eq('id_project', projectId)
        .single();
        
      if (projectError) {
        console.error('Error fetching project:', projectError);
        throw projectError;
      }
      
      if (project?.selected_student) {
        // Set the student back to available
        const { error: availableError } = await supabase
          .from('students')
          .update({ available: true })
          .eq('id_student', project.selected_student);
          
        if (availableError) {
          console.error('Error setting student as available:', availableError);
          throw availableError;
        }
        
        console.log('Set student as available after project completion:', project.selected_student);
      }
      
    } catch (error) {
      console.error('Error in handleProjectCompletion:', error);
      throw error;
    }
  }
}
