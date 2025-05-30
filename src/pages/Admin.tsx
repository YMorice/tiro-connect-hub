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
  selectedStudent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to convert database status to display status
const convertDbStatusToDisplay = (dbStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    'STEP1': 'New',
    'STEP2': 'Proposals', 
    'STEP3': 'Selection',
    'STEP4': 'Payment',
    'STEP5': 'Active',
    'STEP6': 'In progress'
  };
  return statusMap[dbStatus] || dbStatus;
};

// Helper function to convert display status to database status
const convertDisplayStatusToDb = (displayStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    'New': 'STEP1',
    'Proposals': 'STEP2',
    'Selection': 'STEP3', 
    'Payment': 'STEP4',
    'Active': 'STEP5',
    'In progress': 'STEP6'
  };
  return statusMap[displayStatus] || displayStatus;
};

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
            selected_student,
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
          status: convertDbStatusToDisplay(project.status || "STEP1"),
          ownerId: project.id_entrepreneur,
          selectedStudent: project.selected_student,
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
  const newProjects = projects.filter(p => p.status === "New");
  const proposalsProjects = projects.filter(p => p.status === "Proposals");
  const selectionProjects = projects.filter(p => p.status === "Selection");
  const paymentProjects = projects.filter(p => p.status === "Payment");
  const activeProjects = projects.filter(p => p.status === "Active");
  const inProgressProjects = projects.filter(p => p.status === "In progress");

  // Get project status label
  const getStatusLabel = (status: string) => {
    return status;
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case "New": return "bg-blue-500";
      case "Proposals": return "bg-purple-500";
      case "Selection": return "bg-yellow-500";
      case "Payment": return "bg-orange-500";
      case "Active": return "bg-green-500";
      case "In progress": return "bg-gray-500";
      default: return "bg-slate-500";
    }
  };

  // Navigate to student selection page (New)
  const navigateToStudentSelection = (project: Project) => {
    navigate(`/admin/student-selection?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`);
  };

  // View students who accepted project (Proposals)
  const viewAcceptedStudents = (project: Project) => {
    navigate(`/admin/accepted-students?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`);
  };

  // Proceed to entrepreneur review (Proposals -> Selection)
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
      
      // Update project status to Selection in Supabase
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: convertDisplayStatusToDb('Selection') })
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
        p.id === project.id ? { ...p, status: "Selection" } : p
      ));
      
      toast.success("Project moved to entrepreneur review");
    } catch (error) {
      console.error('Error updating project status:', error);
      toast.error("Failed to update project status");
    }
  };

  // Confirm payment for a project (Payment -> Active)
  const confirmPayment = async (project: Project) => {
    try {
      // Update project status to Active in Supabase
      const { error } = await supabase
        .from('projects')
        .update({ status: convertDisplayStatusToDb('Active') })
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
        p.id === project.id ? { ...p, status: "Active" } : p
      ));
      
      toast.success(`Payment confirmed for project "${project.title}"`);
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error("Failed to confirm payment");
    }
  };

  // Mark project as complete (Active -> In progress)
  const markAsComplete = async (project: Project) => {
    try {
      // Update project status to In progress in Supabase
      const { error } = await supabase
        .from('projects')
        .update({ status: convertDisplayStatusToDb('In progress') })
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
        p.id === project.id ? { ...p, status: "In progress" } : p
      ));
      
      toast.success(`Project "${project.title}" marked as complete`);
    } catch (error) {
      console.error('Error marking project as complete:', error);
      toast.error("Failed to update project status");
    }
  };

  // View project conversation
  const viewConversation = (projectId: string) => {
    console.log('Navigating to conversation for project:', projectId);
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
              {project.selectedStudent && (
                <div className="mt-2">
                  <span className="text-sm text-muted-foreground">Selected Student: </span>
                  <span className="text-sm font-medium">{project.selectedStudent}</span>
                </div>
              )}
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
            
            {/* New: Select students */}
            {project.status === "New" && (
              <Button
                onClick={() => navigateToStudentSelection(project)}
                className="w-full sm:w-auto"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Select & Propose Students
              </Button>
            )}
            
            {/* Proposals: View accepted students and propose to entrepreneur */}
            {project.status === "Proposals" && (
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
            
            {/* Payment: Confirm payment */}
            {project.status === "Payment" && (
              <Button 
                onClick={() => confirmPayment(project)}
                className="w-full sm:w-auto"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Confirm Payment
              </Button>
            )}
            
            {/* Active: Mark as complete */}
            {project.status === "Active" && (
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

        <Tabs defaultValue="new">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="new">New ({newProjects.length})</TabsTrigger>
            <TabsTrigger value="proposals">Proposals ({proposalsProjects.length})</TabsTrigger>
            <TabsTrigger value="selection">Selection ({selectionProjects.length})</TabsTrigger>
            <TabsTrigger value="payment">Payment ({paymentProjects.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeProjects.length})</TabsTrigger>
            <TabsTrigger value="inprogress">In Progress ({inProgressProjects.length})</TabsTrigger>
          </TabsList>

          {/* New Projects Tab */}
          <TabsContent value="new" className="space-y-4">
            {newProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No new projects found</p>
                </CardContent>
              </Card>
            ) : (
              newProjects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-4">
            {proposalsProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No projects in the proposal phase</p>
                </CardContent>
              </Card>
            ) : (
              proposalsProjects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* Selection Tab */}
          <TabsContent value="selection" className="space-y-4">
            {selectionProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No projects awaiting entrepreneur selection</p>
                </CardContent>
              </Card>
            ) : (
              selectionProjects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-4">
            {paymentProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No projects awaiting payment confirmation</p>
                </CardContent>
              </Card>
            ) : (
              paymentProjects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* Active Projects Tab */}
          <TabsContent value="active" className="space-y-4">
            {activeProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No active projects found</p>
                </CardContent>
              </Card>
            ) : (
              activeProjects.map(project => renderProjectCard(project))
            )}
          </TabsContent>

          {/* In Progress Projects Tab */}
          <TabsContent value="inprogress" className="space-y-4">
            {inProgressProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No projects in progress found</p>
                </CardContent>
              </Card>
            ) : (
              inProgressProjects.map(project => renderProjectCard(project))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
