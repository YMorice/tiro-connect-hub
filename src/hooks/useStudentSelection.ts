
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
  available?: boolean;
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
        // Fetch only available students for new projects
        console.log('Fetching available students for new project');
        const { data, error } = await supabase
          .from('students')
          .select(`
            id_student,
            biography,
            skills,
            specialty,
            formation,
            available,
            users!inner (
              id_users,
              email,
              name,
              surname,
              role
            )
          `)
          .eq('available', true);
          
        if (error) {
          console.error('Error fetching students:', error);
          throw error;
        }
        
        studentsData = data || [];
      } else if (mode === 'proposals') {
        // Fetch students who have been proposed to and accepted for this project
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
              available,
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
        
        studentsData = data?.map(proposal => proposal.students) || [];
      }
      
      // Transform the data to match the Student type
      const formattedStudents: Student[] = studentsData.map(student => ({
        id: student.id_student,
        email: student.users.email,
        name: `${student.users.name} ${student.users.surname}`,
        bio: student.biography || undefined,
        skills: Array.isArray(student.skills) ? student.skills : [],
        specialty: student.specialty || undefined,
        available: student.available !== false,
      }));
      
      console.log('Formatted students:', formattedStudents);
      setStudents(formattedStudents);
      
      // Extract unique specialties for filter dropdown
      const uniqueSpecialties = Array.from(
        new Set(studentsData.map(student => student.specialty).filter(Boolean))
      ) as string[];
      
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
    if (projectId && mode) {
      fetchStudents();
    } else {
      setLoading(false);
    }
  }, [fetchStudents]);

  const toggleStudentSelection = useCallback((student: Student) => {
    setSelectedStudents(prevSelected => {
      const isSelected = prevSelected.some(s => s.id === student.id);
      if (isSelected) {
        return prevSelected.filter(s => s.id !== student.id);
      } else {
        return [...prevSelected, student];
      }
    });
  }, []);

  const isStudentSelected = useCallback((studentId: string) => {
    return selectedStudents.some(s => s.id === studentId);
  }, [selectedStudents]);

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
