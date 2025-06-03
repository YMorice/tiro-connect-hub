
/**
 * Student Availability Service
 * 
 * This service manages student availability status throughout the project lifecycle.
 * It handles the complex logic of updating student availability when they are selected
 * for projects and when projects are completed.
 * 
 * Key Responsibilities:
 * - Mark selected students as unavailable when chosen for a project
 * - Mark non-selected students as available again after selection
 * - Mark students as available when their projects are completed
 * - Update project records with selected student information
 * 
 * Business Logic:
 * - Students can only work on one project at a time
 * - When an entrepreneur selects a student, all other proposed students become available again
 * - When a project is completed, the assigned student becomes available for new projects
 * 
 * This service is typically called from project management workflows and ensures
 * consistent student availability tracking across the platform.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * StudentAvailabilityService Class
 * 
 * Static service class that provides methods for managing student availability
 * in relation to project assignments and completions.
 */
export class StudentAvailabilityService {
  /**
   * Handles student selection for a project
   * 
   * This method is called when an entrepreneur makes their final choice of student for a project.
   * It performs several database operations to ensure data consistency:
   * 
   * 1. Finds all students who were proposed for this project
   * 2. Sets all non-selected students back to available status
   * 3. Sets the selected student as unavailable
   * 4. Updates the project record with the selected student ID
   * 
   * @param projectId - The ID of the project for which a student is being selected
   * @param selectedStudentId - The ID of the student who was chosen for the project
   * 
   * @throws {Error} If any database operation fails
   * 
   * @example
   * ```typescript
   * await StudentAvailabilityService.handleStudentSelection(
   *   "project-123",
   *   "student-456"
   * );
   * ```
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
   * Handles project completion and student availability update
   * 
   * This method is called when a project reaches completion status.
   * It ensures that the student who was working on the project becomes
   * available for new project assignments.
   * 
   * Process:
   * 1. Fetches the project to find the selected student
   * 2. Updates the student's availability status to true
   * 3. Logs the operation for audit purposes
   * 
   * @param projectId - The ID of the project that has been completed
   * 
   * @throws {Error} If any database operation fails
   * 
   * @example
   * ```typescript
   * await StudentAvailabilityService.handleProjectCompletion("project-123");
   * ```
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
      
      // If there's a selected student, make them available again
      if (project?.selected_student) {
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
