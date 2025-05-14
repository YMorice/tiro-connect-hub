import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Project, User } from "@/types";
import { toast } from "@/components/ui/sonner";
import { Check, X, UserPlus, MessageSquare, CreditCard } from "lucide-react";

// Mock student users for demonstration
const mockStudents: User[] = [
  {
    id: "2",
    email: "student@example.com",
    name: "Jane Student",
    role: "student",
    bio: "Design student with a passion for UI/UX",
    skills: ["UI/UX Design", "Figma", "Adobe XD"],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: "4",
    email: "student2@example.com",
    name: "Mike Student",
    role: "student",
    bio: "Web developer with 2 years of experience",
    skills: ["React", "Node.js", "MongoDB"],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
    id: "5",
    email: "student3@example.com",
    name: "Sarah Student",
    role: "student",
    bio: "Graphic designer specializing in branding",
    skills: ["Photoshop", "Illustrator", "Branding"],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
];

const Admin = () => {
  const { user } = useAuth();
  const { projects, updateProject } = useProjects();
  const navigate = useNavigate();
  const [studentsToAssign, setStudentsToAssign] = useState<{ [projectId: string]: User[] }>({});
  
  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard");
      toast.error("You don't have permission to access this page");
    }
  }, [user, navigate]);

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
  const proposeStudents = (project: Project) => {
    const selectedStudents = studentsToAssign[project.id] || [];
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student to propose");
      return;
    }

    // Update project with proposed students and change status to "open"
    updateProject(project.id, { 
      status: "open",
      // In a real app, you would store the proposed students in a separate table
      // For this mock, we'll just add a note in the description
      description: `${project.description}\n\nProposed students: ${selectedStudents.map(s => s.name).join(", ")}`
    });

    toast.success(`Proposed ${selectedStudents.length} students for project "${project.title}"`);
  };

  // Confirm payment for a project
  const confirmPayment = (project: Project) => {
    updateProject(project.id, { status: "in_progress" });
    toast.success(`Payment confirmed for project "${project.title}"`);
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
                          {mockStudents.map(student => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell>{student.skills?.join(", ") || "N/A"}</TableCell>
                              <TableCell>{student.bio}</TableCell>
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
                          ))}
                        </TableBody>
                      </Table>
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
