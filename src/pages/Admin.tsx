import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/context/message-context";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { UserPlus, MessageSquare, CreditCard, Check, ArrowRight, FileCheck2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const Admin = () => {
  const { user } = useAuth();
  const { sendMessage } = useMessages();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  
  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard");
      toast.error("You don't have permission to access this page");
    }
  }, [user, navigate]);

  // Load projects from Supabase
  useEffect(() => {
    const loadProjects = async () => {
      if (!user || user.role !== "admin") {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        console.log("Fetching projects for admin user:", user.id);
        
        const { data: projectsData, error } = await supabase
          .from('projects')
          .select(`
            id_project,
            title,
            description,
            status,
            id_entrepreneur,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching projects:', error);
          throw error;
        }
        
        console.log("Raw projects data:", projectsData);
        
        const formattedProjects: Project[] = (projectsData || []).map(project => ({
          id: project.id_project,
          title: project.title || "Untitled Project",
          description: project.description || "No description available",
          status: project.status || "STEP1",
          ownerId: project.id_entrepreneur,
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at),
        }));
        
        console.log("Formatted projects:", formattedProjects);
        setProjects(formattedProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    
    loadProjects();
  }, [user]);

  // Group projects by status
  const step1Projects = projects.filter(p => p.status === "STEP1");
  const step2Projects = projects.filter(p => p.status === "STEP2");
  const step3Projects = projects.filter(p => p.status === "STEP3");
  const step4Projects = projects.filter(p => p.status === "STEP4");
  const step5Projects = projects.filter(p => p.status === "STEP5");
  const step6Projects = projects.filter(p => p.status === "STEP6");

  // Get project status label
  const getStatusLabel = (status: string) => {
    switch(status) {
      case "STEP1": return "New Project";
      case "STEP2": return "Awaiting Student Acceptance";
      case "STEP3": return "Awaiting Entrepreneur Selection";
      case "STEP4": return "Awaiting Payment";
      case "STEP5": return "In Progress";
      case "STEP6": return "Completed";
      default: return status;
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case "STEP1": return "bg-blue-500";
      case "STEP2": return "bg-purple-500";
      case "STEP3": return "bg-yellow-500";
      case "STEP4": return "bg-orange-500";
      case "STEP5": return "bg-green-500";
      case "STEP6": return "bg-gray-500";
      default: return "bg-slate-500";
    }
  };

  // Navigate to student selection page (STEP1)
  const navigateToStudentSelection = (project: Project) => {
    navigate(`/admin/student-selection?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`);
  };

  // Send proposals to students (STEP1 -> STEP2)
  const sendProposalsToStudents = async (project: Project) => {
    try {
      // Check if students have been proposed for this project
      const { data: proposalData, error } = await supabase
        .from('proposal_to_student')
        .select('id_student')
        .eq('id_project', project.id);
        
      if (error) {
        throw error;
      }
      
      if (!proposalData || proposalData.length === 0) {
        toast.error("Please select students first before sending proposals");
        return;
      }
      
      // Update project to STEP2 in Supabase
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'STEP2' })
        .eq('id_project', project.id);
        
      if (updateError) {
        throw updateError;
      }
      
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === project.id ? { ...p, status: "STEP2" } : p
      ));
      
      toast.success(`Proposals sent to ${proposalData.length} students`);
    } catch (error) {
      console.error('Error sending proposals:', error);
      toast.error("Failed to send proposals to students");
    }
  };

  // View students who accepted project (STEP2)
  const viewAcceptedStudents = (project: Project) => {
    navigate(`/admin/accepted-students?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`);
  };

  // Proceed to entrepreneur review (STEP2 -> STEP3)
  const proposeToEntrepreneur = async (project: Project) => {
    try {
      // Check if any students have accepted
      const { data: acceptedStudents, error } = await supabase
        .from('proposal_to_student')
        .select('id_student')
        .eq('id_project', project.id)
        .eq('accepted', true);
        
      if (error) {
        throw error;
      }
      
      if (!acceptedStudents || acceptedStudents.length === 0) {
        toast.error("No students have accepted the proposal yet");
        return;
      }
      
      // Update project status to STEP3 in Supabase
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'STEP3' })
        .eq('id_project', project.id);
        
      if (updateError) {
        throw updateError;
      }
      
      // Get the message group for this project and send a message
      const { data: messageGroups } = await supabase
        .from('message_groups')
        .select('id_group')
        .eq('id_project', project.id)
        .limit(1);
        
      if (messageGroups && messageGroups.length > 0) {
        await sendMessage(
          messageGroups[0].id_group,
          `Admin has proposed students for your project "${project.title}". Please review and select a student.`
        );
      }
      
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === project.id ? { ...p, status: "STEP3" } : p
      ));
      
      toast.success("Project moved to entrepreneur review");
    } catch (error) {
      console.error('Error updating project status:', error);
      toast.error("Failed to update project status");
    }
  };

  // Confirm payment for a project (STEP4 -> STEP5)
  const confirmPayment = async (project: Project) => {
    try {
      // Update project status to STEP5 in Supabase
      const { error } = await supabase
        .from('projects')
        .update({ status: 'STEP5' })
        .eq('id_project', project.id);
        
      if (error) {
        throw error;
      }
      
      // Get the message group for this project and send notification
      const { data: messageGroups } = await supabase
        .from('message_groups')
        .select('id_group')
        .eq('id_project', project.id)
        .limit(1);
        
      if (messageGroups && messageGroups.length > 0) {
        await sendMessage(
          messageGroups[0].id_group,
          `Payment confirmed for project "${project.title}". You can now start working on it.`
        );
        
        await sendMessage(
          messageGroups[0].id_group,
          `Admin has confirmed payment. Project status is now "In Progress".`
        );
      }
      
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === project.id ? { ...p, status: "STEP5" } : p
      ));
      
      toast.success(`Payment confirmed for project "${project.title}"`);
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error("Failed to confirm payment");
    }
  };

  // Mark project as complete (STEP5 -> STEP6)
  const markAsComplete = async (project: Project) => {
    try {
      // Update project status to STEP6 in Supabase
      const { error } = await supabase
        .from('projects')
        .update({ status: 'STEP6' })
        .eq('id_project', project.id);
        
      if (error) {
        throw error;
      }
      
      // Get the message group for this project and send completion notification
      const { data: messageGroups } = await supabase
        .from('message_groups')
        .select('id_group')
        .eq('id_project', project.id)
        .limit(1);
        
      if (messageGroups && messageGroups.length > 0) {
        await sendMessage(
          messageGroups[0].id_group,
          `Project "${project.title}" has been marked as completed. Thank you for your work!`
        );
      }
      
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === project.id ? { ...p, status: "STEP6" } : p
      ));
      
      toast.success(`Project "${project.title}" marked as complete`);
    } catch (error) {
      console.error('Error marking project as complete:', error);
      toast.error("Failed to update project status");
    }
  };

  // View project conversation
  const viewConversation = (projectId: string) => {
    navigate(`/messages?projectId=${projectId}`);
  };

  if (!user || user.role !== "admin") {
    return null; // Will redirect in the useEffect
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AppLayout>
    );
  }

  // Render project card with appropriate actions
  const renderProjectCard = (project: Project) => {
    return (
      <Card key={project.id} className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{project.title}</CardTitle>
              <CardDescription>{project.description}</CardDescription>
            </div>
            <Badge className={getStatusBadgeColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
          </div>
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
            
            {/* STEP1: Select students and send proposals */}
            {project.status === "STEP1" && (
              <>
                <Button
                  onClick={() => navigateToStudentSelection(project)}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Select Students
                </Button>
                <Button
                  onClick={() => sendProposalsToStudents(project)}
                  className="w-full sm:w-auto"
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Send Proposals to Students
                </Button>
              </>
            )}
            
            {/* STEP2: View accepted students and propose to entrepreneur */}
            {project.status === "STEP2" && (
              <>
                <Button
                  onClick={() => viewAcceptedStudents(project)}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  View Accepted Students
                </Button>
                <Button
                  onClick={() => proposeToEntrepreneur(project)}
                  className="w-full sm:w-auto"
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Propose to Entrepreneur
                </Button>
              </>
            )}
            
            {/* STEP4: Confirm payment */}
            {project.status === "STEP4" && (
              <Button 
                onClick={() => confirmPayment(project)}
                className="w-full sm:w-auto"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Confirm Payment
              </Button>
            )}
            
            {/* STEP5: Mark as complete */}
            {project.status === "STEP5" && (
              <Button 
                onClick={() => markAsComplete(project)}
                className="w-full sm:w-auto"
              >
                <FileCheck2 className="h-4 w-4 mr-1" />
                Mark as Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage projects through their lifecycle</p>
          {projects.length === 0 && !loading && (
            <p className="text-muted-foreground mt-2">No projects found in the system.</p>
          )}
        </div>

        <Tabs defaultValue="step1">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="step1">New ({step1Projects.length})</TabsTrigger>
            <TabsTrigger value="step2">Proposals ({step2Projects.length})</TabsTrigger>
            <TabsTrigger value="step3">Selection ({step3Projects.length})</TabsTrigger>
            <TabsTrigger value="step4">Payment ({step4Projects.length})</TabsTrigger>
            <TabsTrigger value="step5">Active ({step5Projects.length})</TabsTrigger>
            <TabsTrigger value="step6">Completed ({step6Projects.length})</TabsTrigger>
          </TabsList>

          {/* STEP1: New Projects Tab */}
          <TabsContent value="step1" className="space-y-4">
            {step1Projects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No new projects found</p>
                </CardContent>
              </Card>
            ) : (
              step1Projects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* STEP2: Proposals Tab */}
          <TabsContent value="step2" className="space-y-4">
            {step2Projects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No projects in the proposal phase</p>
                </CardContent>
              </Card>
            ) : (
              step2Projects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* STEP3: Entrepreneur Selection Tab */}
          <TabsContent value="step3" className="space-y-4">
            {step3Projects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No projects awaiting entrepreneur selection</p>
                </CardContent>
              </Card>
            ) : (
              step3Projects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* STEP4: Payment Confirmation Tab */}
          <TabsContent value="step4" className="space-y-4">
            {step4Projects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No projects awaiting payment confirmation</p>
                </CardContent>
              </Card>
            ) : (
              step4Projects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* STEP5: In Progress Projects Tab */}
          <TabsContent value="step5" className="space-y-4">
            {step5Projects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No active projects found</p>
                </CardContent>
              </Card>
            ) : (
              step5Projects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* STEP6: Completed Projects Tab */}
          <TabsContent value="step6" className="space-y-4">
            {step6Projects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No completed projects found</p>
                </CardContent>
              </Card>
            ) : (
              step6Projects.map(project => renderProjectCard(project))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
