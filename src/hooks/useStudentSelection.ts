
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
    if (!projectId) return;

    try {
      setLoading(true);
      
      let studentsData;
      
      if (mode === 'new') {
        // Fetch all students for new projects
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
          
        if (error) throw error;
        studentsData = data || [];
      } else {
        // Fetch only students who accepted the proposal for this project
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
          
        if (error) throw error;
        studentsData = data?.map(proposal => proposal.students) || [];
      }
      
      console.log('Fetched students data:', studentsData);
      
      // Transform the data to match the Student type
      const formattedStudents: Student[] = studentsData.map(student => ({
        id: student.id_student,
        email: student.users.email,
        name: `${student.users.name} ${student.users.surname}`,
        bio: student.biography || undefined,
        skills: student.skills || undefined,
        specialty: student.specialty || undefined,
      }));
      
      console.log('Formatted students:', formattedStudents);
      setStudents(formattedStudents);
      
      // Extract unique specialties for filter dropdown
      const uniqueSpecialties = Array.from(
        new Set(studentsData.map(student => student.specialty).filter(Boolean))
      ) as string[];
      
      setSpecialties(uniqueSpecialties);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error(mode === 'new' 
        ? "Failed to load student profiles" 
        : "Failed to load students who accepted the proposal");
    } finally {
      setLoading(false);
    }
  }, [projectId, mode]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const toggleStudentSelection = (student: Student) => {
    setSelectedStudents(prevSelected => {
      const isSelected = prevSelected.some(s => s.id === student.id);
      if (isSelected) {
        return prevSelected.filter(s => s.id !== student.id);
      } else {
        return [...prevSelected, student];
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
