
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface Student {
  id: string;
  email: string;
  name: string;
  bio?: string;
  skills?: string[];
  specialty?: string;
}

interface UseStudentSelectionProps {
  projectId: string | null;
  mode: 'new' | 'proposals';
}

export const useStudentSelection = ({ projectId, mode }: UseStudentSelectionProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState<string[]>([]);

  const fetchStudents = useCallback(async () => {
    if (!projectId) {
      console.log('No project ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching students for project ${projectId} in mode: ${mode}`);
      
      let studentsData: any[] = [];
      
      if (mode === 'new') {
        // Fetch all students for new projects
        console.log('Fetching all students for new project');
        const { data, error } = await supabase
          .from('students')
          .select(`
            id_student,
            biography,
            skills,
            specialty,
            formation,
            users!inner (
              id_users,
              email,
              name,
              surname,
              role
            )
          `);
          
        if (error) {
          console.error('Error fetching students:', error);
          throw error;
        }
        
        console.log('Raw students data:', data);
        studentsData = data || [];
      } else if (mode === 'proposals') {
        // Fetch only students who accepted the proposal for this project
        console.log('Fetching students who accepted proposals for project:', projectId);
        const { data, error } = await supabase
          .from('proposal_to_student')
          .select(`
            students!inner (
              id_student,
              biography,
              skills,
              specialty,
              formation,
              users!inner (
                id_users,
                email,
                name,
                surname,
                role
              )
            )
          `)
          .eq('id_project', projectId)
          .eq('accepted', true);
          
        if (error) {
          console.error('Error fetching accepted students:', error);
          throw error;
        }
        
        console.log('Raw proposal data:', data);
        studentsData = data?.map(proposal => proposal.students) || [];
      }
      
      console.log('Students data to process:', studentsData);
      
      // Transform the data to match the Student type
      const formattedStudents: Student[] = studentsData.map(student => {
        console.log('Processing student:', student);
        return {
          id: student.id_student,
          email: student.users.email,
          name: `${student.users.name} ${student.users.surname}`,
          bio: student.biography || undefined,
          skills: Array.isArray(student.skills) ? student.skills : [],
          specialty: student.specialty || undefined,
        };
      });
      
      console.log('Formatted students:', formattedStudents);
      setStudents(formattedStudents);
      
      // Extract unique specialties for filter dropdown
      const uniqueSpecialties = Array.from(
        new Set(studentsData.map(student => student.specialty).filter(Boolean))
      ) as string[];
      
      console.log('Unique specialties:', uniqueSpecialties);
      setSpecialties(uniqueSpecialties);
    } catch (error) {
      console.error('Error in fetchStudents:', error);
      toast.error(mode === 'new' 
        ? "Failed to load student profiles" 
        : "Failed to load students who accepted the proposal");
    } finally {
      setLoading(false);
    }
  }, [projectId, mode]);

  useEffect(() => {
    console.log('useStudentSelection effect triggered with:', { projectId, mode });
    fetchStudents();
  }, [fetchStudents]);

  const toggleStudentSelection = (student: Student) => {
    console.log('Toggling selection for student:', student.name);
    setSelectedStudents(prevSelected => {
      const isSelected = prevSelected.some(s => s.id === student.id);
      if (isSelected) {
        const newSelected = prevSelected.filter(s => s.id !== student.id);
        console.log('Student deselected, new selection:', newSelected.map(s => s.name));
        return newSelected;
      } else {
        const newSelected = [...prevSelected, student];
        console.log('Student selected, new selection:', newSelected.map(s => s.name));
        return newSelected;
      }
    });
  };

  const isStudentSelected = (studentId: string) => {
    return selectedStudents.some(s => s.id === studentId);
  };

  return {
    students,
    selectedStudents,
    loading,
    specialties,
    toggleStudentSelection,
    isStudentSelected,
    refetch: fetchStudents
  };
};
