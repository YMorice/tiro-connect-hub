import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import { useMessages } from "@/context/message-context";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Project } from "@/types";
import { toast } from "@/components/ui/sonner";
import { UserPlus, MessageSquare, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

const Admin = () => {
  const { user } = useAuth();
  const { projects, updateProject } = useProjects();
  const { sendMessage } = useMessages();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  
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

  // Navigate to student selection page
  const navigateToStudentSelection = (project: Project) => {
    navigate(`/admin/student-selection?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`);
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
                    <div className="flex justify-end">
                      <Button
                        onClick={() => navigateToStudentSelection(project)}
                        className="w-full sm:w-auto"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Select Students to Propose
                      </Button>
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
                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => viewConversation(project.id)}
                        className="w-full sm:w-auto"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        View Conversation
                      </Button>
                      <Button 
                        onClick={() => confirmPayment(project)}
                        className="w-full sm:w-auto"
                      >
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
                        className="w-full sm:w-auto"
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
                        className="w-full sm:w-auto"
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
