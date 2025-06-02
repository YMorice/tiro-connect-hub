
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, MapPin, Award } from "lucide-react";

interface ProposedStudent {
  id: string;
  name: string;
  email: string;
  bio?: string;
  skills?: string[];
  specialty?: string;
  portfolioLink?: string;
  avatar?: string;
}

interface ProposedStudentsDisplayProps {
  projectId: string;
  projectStatus: string;
  isEntrepreneur?: boolean;
  onStudentSelected?: (studentId: string) => void;
}

export const ProposedStudentsDisplay = ({ 
  projectId, 
  projectStatus, 
  isEntrepreneur = false,
  onStudentSelected 
}: ProposedStudentsDisplayProps) => {
  const [proposedStudents, setProposedStudents] = useState<ProposedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    const fetchProposedStudents = async () => {
      try {
        setLoading(true);
        console.log('Fetching proposed students for project:', projectId);
        
        // For Selection status, fetch from proposed_student table
        // For Proposals status, fetch from proposal_to_student table
        let studentsData: any[] = [];
        
        if (projectStatus === 'Selection') {
          const { data, error } = await supabase
            .from('proposed_student')
            .select(`
              student_id,
              students!inner (
                id_student,
                biography,
                skills,
                specialty,
                portfolio_link,
                users!inner (
                  id_users,
                  email,
                  name,
                  surname,
                  pp_link
                )
              )
            `)
            .eq('project_id', projectId);
            
          if (error) throw error;
          studentsData = data?.map(item => item.students) || [];
        } else if (projectStatus === 'Proposals') {
          const { data, error } = await supabase
            .from('proposal_to_student')
            .select(`
              id_student,
              accepted,
              students!inner (
                id_student,
                biography,
                skills,
                specialty,
                portfolio_link,
                users!inner (
                  id_users,
                  email,
                  name,
                  surname,
                  pp_link
                )
              )
            `)
            .eq('id_project', projectId)
            .eq('accepted', true);
            
          if (error) throw error;
          studentsData = data?.map(item => item.students) || [];
        }
        
        const formattedStudents: ProposedStudent[] = studentsData.map(student => ({
          id: student.id_student,
          name: `${student.users.name} ${student.users.surname}`,
          email: student.users.email,
          bio: student.biography || undefined,
          skills: Array.isArray(student.skills) ? student.skills : [],
          specialty: student.specialty || undefined,
          portfolioLink: student.portfolio_link || undefined,
          avatar: student.users.pp_link || undefined,
        }));
        
        console.log('Formatted proposed students:', formattedStudents);
        setProposedStudents(formattedStudents);
      } catch (error) {
        console.error('Error fetching proposed students:', error);
        toast.error("Failed to load proposed students");
      } finally {
        setLoading(false);
      }
    };

    if (projectId && (projectStatus === 'Selection' || projectStatus === 'Proposals')) {
      fetchProposedStudents();
    } else {
      setLoading(false);
    }
  }, [projectId, projectStatus]);

  const handleSelectStudent = async (studentId: string) => {
    if (!isEntrepreneur) return;
    
    try {
      setSelecting(true);
      console.log('Entrepreneur selecting student:', studentId, 'for project:', projectId);
      
      // Update project with selected student and change status to Payment
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          selected_student: studentId,
          status: 'STEP4' // Payment status
        })
        .eq('id_project', projectId);
        
      if (updateError) throw updateError;
      
      // Handle student availability (set selected student as unavailable, others as available)
      const { error: availabilityError } = await supabase.rpc('handle_student_selection', {
        project_id: projectId,
        selected_student_id: studentId
      });
      
      if (availabilityError) {
        console.warn('Student availability function not found, handling manually');
        
        // Set all proposed students as available except the selected one
        const otherStudentIds = proposedStudents
          .filter(s => s.id !== studentId)
          .map(s => s.id);
          
        if (otherStudentIds.length > 0) {
          await supabase
            .from('students')
            .update({ available: true })
            .in('id_student', otherStudentIds);
        }
        
        // Set selected student as unavailable
        await supabase
          .from('students')
          .update({ available: false })
          .eq('id_student', studentId);
      }
      
      toast.success("Student selected successfully! Project status updated to Payment.");
      
      if (onStudentSelected) {
        onStudentSelected(studentId);
      }
      
    } catch (error) {
      console.error('Error selecting student:', error);
      toast.error("Failed to select student");
    } finally {
      setSelecting(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proposed Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (proposedStudents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proposed Students</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No students have been proposed for this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Proposed Students ({proposedStudents.length})
        </CardTitle>
        {isEntrepreneur && projectStatus === 'Selection' && (
          <p className="text-sm text-muted-foreground">
            Select the student you'd like to work with for this project.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proposedStudents.map((student) => (
            <Card key={student.id} className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    {student.avatar ? (
                      <AvatarImage src={student.avatar} alt={student.name} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials(student.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{student.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  </div>
                </div>

                {student.specialty && (
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{student.specialty}</span>
                  </div>
                )}

                {student.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {student.bio}
                  </p>
                )}

                {student.skills && student.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {student.skills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {student.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{student.skills.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {student.portfolioLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => window.open(student.portfolioLink, '_blank')}
                  >
                    View Portfolio
                  </Button>
                )}

                {isEntrepreneur && projectStatus === 'Selection' && (
                  <Button
                    onClick={() => handleSelectStudent(student.id)}
                    disabled={selecting}
                    className="w-full"
                    size="sm"
                  >
                    {selecting ? 'Selecting...' : 'Select This Student'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
