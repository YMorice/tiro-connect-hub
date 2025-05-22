
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import { useMessages } from "@/context/message-context";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Project, User } from "@/types";
import { toast } from "@/components/ui/sonner";
import { Check, X, UserPlus, MessageSquare, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const { user } = useAuth();
  const { projects, updateProject } = useProjects();
  const { sendMessage } = useMessages();
  const navigate = useNavigate();
  const [studentsToAssign, setStudentsToAssign] = useState<{ [projectId: string]: User[] }>({});
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard");
      toast.error("You don't have permission to access this page");
    }
  }, [user, navigate]);

  // Fetch students from database
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        const { data: studentsData, error } = await supabase
          .from('students')
          .select(`
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
              created_at
            )
          `);
          
        if (error) {
          throw error;
        }
        
        // Transform the data to match the User type
        const formattedStudents: User[] = studentsData.map(student => ({
          id: student.id_student,
          email: student.users.email,
          name: `${student.users.name} ${student.users.surname}`,
          role: "student" as const,
          bio: student.biography || undefined,
          skills: student.skills || undefined,
          createdAt: new Date(student.users.created_at),
        }));
        
        setStudents(formattedStudents);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error("Failed to load student profiles");
      } finally {
        setLoading(false);
      }
    };
    
    if (user && user.role === "admin") {
      fetchStudents();
    }
  }, [user]);

  // Group projects by status
  const draftProjects = projects.filter(p => p.status === "draft");
  const openProjects = projects.filter(p => p.status === "open");
  const inProgressProjects = projects.filter(p => p.status === "in_progress");
  const otherProjects = projects.filter(p => !["draft", "open", "in_progress"].includes(p.status));

  // Initialize students to assign
  useEffect(() => {
    const initialStudentsToAssign: { [projectId: string]: User[] } = {};
    draftProjects.forEach(project => {
      initialStudentsToAssign[project.id] = [];
    });
    setStudentsToAssign(initialStudentsToAssign);
  }, [draftProjects]);

  // Toggle student selection for a project
  const toggleStudentForProject = (projectId: string, student: User) => {
    setStudentsToAssign(prev => {
      const currentStudents = prev[projectId] || [];
      const studentIndex = currentStudents.findIndex(s => s.id === student.id);
      
      if (studentIndex >= 0) {
        // Remove student
        return {
          ...prev,
          [projectId]: currentStudents.filter(s => s.id !== student.id)
        };
      } else {
        // Add student
        return {
          ...prev,
          [projectId]: [...currentStudents, student]
        };
      }
    });
  };

  // Check if student is selected for a project
  const isStudentSelected = (projectId: string, studentId: string) => {
    return (studentsToAssign[projectId] || []).some(s => s.id === studentId);
  };

  // Propose students for a project
  const proposeStudents = async (project: Project) => {
    const selectedStudents = studentsToAssign[project.id] || [];
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student to propose");
      return;
    }

    try {
      // Update project status to "open" in Supabase
      const { error } = await supabase
        .from('projects')
        .update({ status: 'open' })
        .eq('id_project', project.id);
        
      if (error) {
        throw error;
      }
      
      // Create project assignments for selected students
      const assignments = selectedStudents.map(student => ({
        id_project: project.id,
        id_student: student.id,
        status: 'proposed',
        role: 'developer'
      }));
      
      const { error: assignmentError } = await supabase
        .from('project_assignments')
        .insert(assignments);
        
      if (assignmentError) {
        throw assignmentError;
      }
      
      // Send a message to each proposed student
      for (const student of selectedStudents) {
        // Using the new project-based messaging
        await sendMessage(student.id, `You've been proposed for project: ${project.title}`, project.id);
      }
      
      // Update project in local state
      updateProject(project.id, { 
        status: "open",
      });

      toast.success(`Proposed ${selectedStudents.length} students for project "${project.title}"`);
    } catch (error) {
      console.error('Error proposing students:', error);
      toast.error("Failed to propose students");
    }
  };

  // Confirm payment for a project
  const confirmPayment = async (project: Project) => {
    try {
      // Update project status to "in_progress" in Supabase
      const { error } = await supabase
        .from('projects')
        .update({ status: 'in_progress' })
        .eq('id_project', project.id);
        
      if (error) {
        throw error;
      }
      
      // Get assigned students for this project
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('id_student')
        .eq('id_project', project.id);
        
      if (assignments && assignments.length > 0) {
        // Send notification message to all assigned students
        for (const assignment of assignments) {
          await sendMessage(
            assignment.id_student,
            `Payment confirmed for project "${project.title}". You can now start working on it.`,
            project.id
          );
        }
      }
      
      // Update project in local state
      updateProject(project.id, { status: "in_progress" });
      toast.success(`Payment confirmed for project "${project.title}"`);
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error("Failed to confirm payment");
    }
  };

  // View project conversation
  const viewConversation = (projectId: string) => {
    navigate(`/messages?projectId=${projectId}`);
  };

  if (!user || user.role !== "admin") {
    return null; // Will redirect in the useEffect
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage projects, students, and entrepreneurs</p>
        </div>

        <Tabs defaultValue="draft">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="draft">Draft ({draftProjects.length})</TabsTrigger>
            <TabsTrigger value="open">Open ({openProjects.length})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({inProgressProjects.length})</TabsTrigger>
            <TabsTrigger value="other">Other ({otherProjects.length})</TabsTrigger>
          </TabsList>

          {/* Draft Projects Tab - Where admin proposes students */}
          <TabsContent value="draft" className="space-y-4">
            {draftProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No draft projects found</p>
                </CardContent>
              </Card>
            ) : (
              draftProjects.map(project => (
                <Card key={project.id} className="mb-6">
                  <CardHeader>
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <h3 className="font-medium">Select students to propose:</h3>
                      {loading ? (
                        <div className="flex justify-center py-6">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-purple"></div>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Skills</TableHead>
                              <TableHead>Experience</TableHead>
                              <TableHead>Select</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.length > 0 ? (
                              students.map(student => (
                                <TableRow key={student.id}>
                                  <TableCell className="font-medium">{student.name}</TableCell>
                                  <TableCell>{student.skills?.join(", ") || "N/A"}</TableCell>
                                  <TableCell>{student.bio || "N/A"}</TableCell>
                                  <TableCell>
                                    <Button 
                                      variant={isStudentSelected(project.id, student.id) ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleStudentForProject(project.id, student)}
                                    >
                                      {isStudentSelected(project.id, student.id) ? (
                                        <>
                                          <Check className="h-4 w-4 mr-1" />
                                          Selected
                                        </>
                                      ) : (
                                        <>
                                          <UserPlus className="h-4 w-4 mr-1" />
                                          Select
                                        </>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                  No student profiles found
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      )}
                      <div className="flex justify-end">
                        <Button onClick={() => proposeStudents(project)}>
                          Propose Selected Students
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Open Projects Tab - Where admin confirms payment */}
          <TabsContent value="open" className="space-y-4">
            {openProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No open projects found</p>
                </CardContent>
              </Card>
            ) : (
              openProjects.map(project => (
                <Card key={project.id} className="mb-6">
                  <CardHeader>
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => viewConversation(project.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        View Conversation
                      </Button>
                      <Button onClick={() => confirmPayment(project)}>
                        <CreditCard className="h-4 w-4 mr-1" />
                        Confirm Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* In Progress Projects Tab - Where admin can view conversations */}
          <TabsContent value="in-progress" className="space-y-4">
            {inProgressProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No in-progress projects found</p>
                </CardContent>
              </Card>
            ) : (
              inProgressProjects.map(project => (
                <Card key={project.id} className="mb-6">
                  <CardHeader>
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => viewConversation(project.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        View Conversation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Other Projects Tab */}
          <TabsContent value="other" className="space-y-4">
            {otherProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No other projects found</p>
                </CardContent>
              </Card>
            ) : (
              otherProjects.map(project => (
                <Card key={project.id} className="mb-6">
                  <CardHeader>
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription>
                      Status: {project.status}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>{project.description}</p>
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => viewConversation(project.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        View Conversation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
