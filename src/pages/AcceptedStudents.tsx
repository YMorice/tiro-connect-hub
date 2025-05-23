
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Check, UserPlus } from "lucide-react";
import { User } from "@/types";

const AcceptedStudents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const projectTitle = searchParams.get('projectTitle');
  
  const [acceptedStudents, setAcceptedStudents] = useState<User[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard");
      toast.error("You don't have permission to access this page");
    }
    
    if (!projectId) {
      navigate("/admin");
      toast.error("No project selected");
    }
  }, [user, navigate, projectId]);

  // Fetch students who accepted the project proposal
  useEffect(() => {
    const fetchAcceptedStudents = async () => {
      try {
        setLoading(true);
        
        // Get students who accepted the proposal
        const { data: proposalData, error } = await supabase
          .from('proposal_to_student')
          .select(`
            id_student,
            accepted,
            students (
              id_student,
              biography,
              skills,
              specialty,
              formation,
              users (
                id_users,
                email,
                name,
                surname,
                role,
                pp_link,
                created_at
              )
            )
          `)
          .eq('id_project', projectId)
          .eq('accepted', true);
          
        if (error) {
          throw error;
        }
        
        // Transform the data to match the User type
        const formattedStudents: User[] = proposalData.map(proposal => ({
          id: proposal.students.id_student,
          email: proposal.students.users.email,
          name: `${proposal.students.users.name} ${proposal.students.users.surname}`,
          role: "student" as const,
          avatar: proposal.students.users.pp_link || undefined,
          bio: proposal.students.biography || undefined,
          skills: proposal.students.skills || undefined,
          specialty: proposal.students.specialty || undefined,
          createdAt: new Date(proposal.students.users.created_at),
        }));
        
        setAcceptedStudents(formattedStudents);
      } catch (error) {
        console.error('Error fetching accepted students:', error);
        toast.error("Failed to load accepted students");
      } finally {
        setLoading(false);
      }
    };
    
    if (user && user.role === "admin" && projectId) {
      fetchAcceptedStudents();
    }
  }, [user, projectId]);

  // Toggle student selection
  const toggleStudentSelection = (student: User) => {
    setSelectedStudents(prevSelected => {
      const isSelected = prevSelected.some(s => s.id === student.id);
      if (isSelected) {
        return prevSelected.filter(s => s.id !== student.id);
      } else {
        return [...prevSelected, student];
      }
    });
  };

  // Check if student is selected
  const isStudentSelected = (studentId: string) => {
    return selectedStudents.some(s => s.id === studentId);
  };

  // Propose selected students to the entrepreneur
  const proposeToEntrepreneur = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student to propose");
      return;
    }

    try {
      // Add entries to proposed_student table
      const proposedEntries = selectedStudents.map(student => ({
        project_id: projectId,
        student_id: student.id
      }));
      
      const { error: proposedError } = await supabase
        .from('proposed_student')
        .insert(proposedEntries);
        
      if (proposedError) {
        throw proposedError;
      }
      
      // Set project status to STEP3
      const { error: projectError } = await supabase
        .from('projects')
        .update({ status: 'STEP3' })
        .eq('id_project', projectId);
        
      if (projectError) {
        throw projectError;
      }
      
      toast.success(`Proposed ${selectedStudents.length} students to the entrepreneur`);
      navigate('/admin');
    } catch (error) {
      console.error('Error proposing students:', error);
      toast.error("Failed to propose students");
    }
  };

  // Navigate back to admin page
  const goBack = () => {
    navigate('/admin');
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button 
              onClick={goBack}
              className="flex items-center text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Admin
            </button>
            <h1 className="text-3xl font-bold">Accepted Students</h1>
            <p className="text-muted-foreground">
              {projectTitle ? `For project: ${projectTitle}` : 'Students who accepted the proposal'}
            </p>
          </div>
          <div>
            <Button 
              onClick={proposeToEntrepreneur}
              disabled={selectedStudents.length === 0}
              className="flex items-center"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Propose {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''} to Entrepreneur
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Students who accepted ({acceptedStudents.length})</CardTitle>
            <CardDescription>
              Select students to propose to the entrepreneur
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-purple"></div>
              </div>
            ) : acceptedStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No students have accepted the proposal yet</p>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    {selectedStudents.length === 0 
                      ? "No students selected" 
                      : `${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} selected`}
                  </p>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Skills</TableHead>
                        <TableHead className="hidden md:table-cell">Specialty</TableHead>
                        <TableHead className="hidden lg:table-cell">Bio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {acceptedStudents.map(student => (
                        <TableRow 
                          key={student.id}
                          className={isStudentSelected(student.id) ? "bg-muted/50" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isStudentSelected(student.id)}
                              onCheckedChange={() => toggleStudentSelection(student)}
                              aria-label={`Select ${student.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {student.skills?.map((skill, index) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted"
                                >
                                  {skill}
                                </span>
                              )) || "No skills listed"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {student.specialty || "Not specified"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[300px] truncate">
                            {student.bio || "No bio available"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AcceptedStudents;
