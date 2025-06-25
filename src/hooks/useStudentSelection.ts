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
        // 1. Récupérer tous les étudiants
        const { data: studentProfiles, error: studentError } = await supabase
          .from('students')
          .select('*');
        if (studentError) {
          console.error('Error fetching student profiles:', studentError);
          throw studentError;
        }

        // 2. Récupérer tous les users correspondants
        const userIds = studentProfiles?.map(profile => profile.id_user) || [];
        let usersData = [];
        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .in('id_users', userIds);
          if (usersError) {
            console.error('Error fetching users:', usersError);
            // On continue quand même, on affichera des placeholders
          } else {
            usersData = users;
          }
        }

        // 3. Fusionner les données étudiants + users (robuste)
        studentsData = studentProfiles.map(profile => {
          const userData = usersData.find(u => u.id_users === profile.id_user);
          // Si user trouvé, on prend le nom/prénom réel
          // Sinon, on affiche un placeholder lisible
          const name = userData ? `${userData.name} ${userData.surname}` : `Étudiant ${profile.id_student.slice(-4)}`;
          const email = userData ? userData.email : 'Email non disponible';
          return {
            id: profile.id_student,
            email,
            name,
            bio: profile.biography || undefined,
            skills: Array.isArray(profile.skills) ? profile.skills : [],
            specialty: profile.specialty || undefined,
            available: profile.available !== false,
          };
        });
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
      
      console.log('Formatted students:', studentsData);
      setStudents(studentsData);
      
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
