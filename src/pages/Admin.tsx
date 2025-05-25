
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import { useMessages } from "@/context/message-context";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Project } from "@/types";
import { toast } from "@/components/ui/sonner";
import { UserPlus, MessageSquare, CreditCard, Check, ArrowRight, FileCheck2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

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
      const { data: proposedStudents, error } = await supabase
        .from('proposed_student')
        .select('student_id')
        .eq('project_id', project.id);
        
      if (error) {
        throw error;
      }
      
      if (!proposedStudents || proposedStudents.length === 0) {
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
      updateProject(project.id, { status: "STEP2" });
      
      toast.success(`Proposals sent to ${proposedStudents.length} students`);
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
      // Update project status to STEP3 in Supabase
      const { error } = await supabase
        .from('projects')
        .update({ status: 'STEP3' })
        .eq('id_project', project.id);
        
      if (error) {
        throw error;
      }
      
      // Get entrepreneur data
      const { data: projectData } = await supabase
        .from('projects')
        .select('id_entrepreneur')
        .eq('id_project', project.id)
        .single();
        
      if (projectData) {
        // Send message to entrepreneur
        await sendMessage(
          projectData.id_entrepreneur,
          `Admin has proposed students for your project "${project.title}". Please review and select a student.`,
          project.id
        );
      }
      
      // Update local state
      updateProject(project.id, { status: "STEP3" });
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
      
      // Get assigned students for this project
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('id_student')
        .eq('id_project', project.id);
        
      if (assignments && assignments.length > 0) {
        // Send notification message to all assigned students
        for (const assignment of assignments) {
          // Send message to notify students
          await sendMessage(
            assignment.id_student,
            `Payment confirmed for project "${project.title}". You can now start working on it.`,
            project.id
          );
          
          // Also send a message to the project group chat
          await sendMessage(
            "",  // Empty recipient means it's a group message
            `Admin has confirmed payment. Student has been added to this conversation. Project status is now "In Progress".`,
            project.id
          );
        }
      }
      
      // Update project in local state
      updateProject(project.id, { status: "STEP5" });
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
      
      // Get assigned students and entrepreneur for this project
      const { data: projectData } = await supabase
        .from('projects')
        .select('id_entrepreneur')
        .eq('id_project', project.id)
        .single();
      
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('id_student')
        .eq('id_project', project.id);
        
      if (projectData && assignments && assignments.length > 0) {
        // Send notification to entrepreneur
        await sendMessage(
          projectData.id_entrepreneur,
          `Your project "${project.title}" has been marked as completed. Please leave a review for your student.`,
          project.id
        );
        
        // Send notification to student
        for (const assignment of assignments) {
          await sendMessage(
            assignment.id_student,
            `Project "${project.title}" has been marked as completed. Congratulations!`,
            project.id
          );
        }
        
        // Group notification
        await sendMessage(
          "",  // Empty recipient means it's a group message
          `Admin has marked this project as completed. Thank you for your work!`,
          project.id
        );
      }
      
      // Update project in local state
      updateProject(project.id, { status: "STEP6" });
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
