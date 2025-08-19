import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, MapPin, GraduationCap, Star } from 'lucide-react';
import StudentReviewBadge from '@/components/reviews/StudentReviewBadge';

interface ProposedStudent {
  id_student: string;
  users: {
    name: string;
    surname: string;
    email: string;
    pp_link?: string;
  };
  biography?: string;
  specialty?: string;
  skills?: string[];
  formation?: string;
  portfolio_link?: string;
  available: boolean;
}

interface StudentSelectionViewProps {
  projectId: string;
  onStudentSelected: () => void;
}

const StudentSelectionView: React.FC<StudentSelectionViewProps> = ({ 
  projectId, 
  onStudentSelected 
}) => {
  const [proposedStudents, setProposedStudents] = useState<ProposedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [projectHasSelectedStudent, setProjectHasSelectedStudent] = useState(false);

  useEffect(() => {
    fetchProjectStatus();
    fetchProposedStudents();
    fetchAcceptedStudents();
  }, [projectId]);

  const fetchProjectStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('selected_student')
        .eq('id_project', projectId)
        .single();

      if (error) {
        console.error('Error fetching project status:', error);
        return;
      }

      setProjectHasSelectedStudent(!!data?.selected_student);
    } catch (error) {
      console.error('Error checking project status:', error);
    }
  };

  const fetchProposedStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching proposed students for project:', projectId);

      // Fetch from proposed_student table with student details
      const { data, error } = await supabase
        .from('proposed_student')
        .select(`
          student_id,
          students!inner (
            id_student,
            biography,
            specialty,
            skills,
            formation,
            portfolio_link,
            available,
            users!inner (
              name,
              surname,
              email,
              pp_link
            )
          )
        `)
        .eq('project_id', projectId);

      console.log('Résultat requête proposed_student :', { data, error });

      if (error) {
        console.error('Error fetching proposed students:', error);
        throw error;
      }

      const formattedStudents: ProposedStudent[] = (data || []).map(item => ({
        id_student: item.students.id_student,
        users: {
          name: item.students.users.name,
          surname: item.students.users.surname,
          email: item.students.users.email,
          pp_link: item.students.users.pp_link,
        },
        biography: item.students.biography,
        specialty: item.students.specialty,
        skills: item.students.skills,
        formation: item.students.formation,
        portfolio_link: item.students.portfolio_link,
        available: item.students.available,
      }));

      console.log('Proposed students loaded:', formattedStudents.length);
      setProposedStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching proposed students:', error);
      toast.error('Failed to load proposed students');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcceptedStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching accepted students for project:', projectId);
      const { data, error } = await supabase
        .from('proposal_to_student')
        .select('id_student')
        .eq('id_project', projectId)
        .eq('accepted', true);
      console.log('Résultat requête étudiants acceptés :', { data, error });
      // ... (traitement des données si besoin)
    } catch (error) {
      console.error('Error fetching accepted students:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = async (studentId: string) => {
    try {
      setSelecting(studentId);
      console.log('Selecting student:', studentId, 'for project:', projectId);

      // Update project with selected student and change status to Payment
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          selected_student: studentId,
          status: 'STEP4' // Payment status
        })
        .eq('id_project', projectId);

      if (updateError) {
        console.error('Error updating project:', updateError);
        throw updateError;
      }

      // SUPPRIMÉ : ajout de l'étudiant au groupe de discussion (message_groups)
      // L'ajout se fait désormais uniquement côté backend après paiement (STEP5).

      toast.success('Profil choisi avec succès');
      onStudentSelected();
    } catch (error) {
      console.error('Error selecting student:', error);
      toast.error('Échec de la sélection du profil');
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiro-primary"></div>
      </div>
    );
  }

  // Si un étudiant a déjà été sélectionné, ne pas afficher les cards
  if (projectHasSelectedStudent) {
    return null;
  }

  if (proposedStudents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Aucun étudiant n'a encore été proposé pour ce projet.</p>
        <p className="text-sm text-gray-400 mt-2">L'administrateur proposera des étudiants parmi lesquels vous pourrez choisir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 bg-tiro-white">
        {proposedStudents.map((student) => (
          <Card key={student.id_student} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Avatar */}
                <Avatar className="w-16 h-16 flex-shrink-0 mx-auto sm:mx-0">
                  {student.users.pp_link ? (
                    <AvatarImage 
                      src={student.users.pp_link} 
                      alt={`${student.users.name}`}
                    />
                  ) : (
                    <AvatarFallback className="bg-tiro-primary text-white text-lg">
                      {student.users.name.charAt(0).toUpperCase()}
                      {student.users.surname.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Student Info */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                    <div className="min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {student.users.name}
                      </h4>
                      
                      {/* Add student review badge */}
                      <div className="mt-1 flex justify-center sm:justify-start">
                        <StudentReviewBadge studentId={student.id_student} />
                      </div>
                    </div>
                  </div>

                  {/* Specialty & Formation */}
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      {student.specialty && (() => {
                        try {
                          // Parse JSON string to array
                          const specialties = typeof student.specialty === 'string' 
                            ? JSON.parse(student.specialty) 
                            : Array.isArray(student.specialty) 
                              ? student.specialty 
                              : [student.specialty];
                          
                          return specialties.map((spec: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              {spec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/Ui Ux/g, 'Design de site Web')}
                            </Badge>
                          ));
                        } catch {
                          // Fallback if parsing fails
                          return (
                            <Badge variant="secondary" className="text-xs">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              {student.specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/Ui Ux/g, 'Design de site Web')}
                            </Badge>
                          );
                        }
                      })()}
                      {student.formation && (
                        <span className="text-sm text-tiro-black font-medium">
                          - {student.formation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Biography */}
                  {student.biography && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3 text-center sm:text-left">
                      {student.biography}
                    </p>
                  )}

                  {/* Skills */}
                  {student.skills && student.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2 text-center sm:text-left">Skills:</p>
                      <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
                        {student.skills.slice(0, 5).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {student.skills.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{student.skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Portfolio Link */}
                  {student.portfolio_link && (
                    <div className="mb-4 text-center sm:text-left">
                      <a 
                        href={student.portfolio_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-tiro-primary hover:underline"
                      >
                        Voir mon portfolio →
                      </a>
                    </div>
                  )}

                  {/* Select Button */}
                  <Button
                    onClick={() => selectStudent(student.id_student)}
                    disabled={selecting === student.id_student}
                    className="w-full bg-tiro-primary hover:bg-tiro-primary/90"
                  >
                    {selecting === student.id_student ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Selecting...
                      </>
                    ) : (
                      'Choisir ce profil'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StudentSelectionView;
