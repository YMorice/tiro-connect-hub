
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { Users, MessageCircle, Plus, Search, Eye, UserPlus, Filter } from "lucide-react";
import { StudentAvailabilityService } from "@/services/student-availability-service";

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  entrepreneur: {
    name: string;
    companyName?: string;
  };
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

// Helper function to get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'New': return 'bg-blue-100 text-blue-800';
    case 'Proposals': return 'bg-yellow-100 text-yellow-800';
    case 'Selection': return 'bg-purple-100 text-purple-800';
    case 'Payment': return 'bg-orange-100 text-orange-800';
    case 'Active': return 'bg-green-100 text-green-800';
    case 'In progress': return 'bg-indigo-100 text-indigo-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (user && (user as any).role !== "admin") {
      navigate("/dashboard");
      toast.error("You don't have permission to access this page");
    }
  }, [user, navigate]);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        
        const { data: projectsData, error } = await supabase
          .from('projects')
          .select(`
            id_project,
            title,
            description,
            status,
            created_at,
            entrepreneurs (
              id_entrepreneur,
              company_name,
              users (
                name,
                surname
              )
            )
          `)
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        const formattedProjects: Project[] = projectsData.map(project => ({
          id: project.id_project,
          title: project.title,
          description: project.description || undefined,
          status: convertDbStatusToDisplay(project.status || 'STEP1'),
          created_at: project.created_at,
          entrepreneur: {
            name: `${project.entrepreneurs.users.name} ${project.entrepreneurs.users.surname}`,
            companyName: project.entrepreneurs.company_name || undefined,
          }
        }));
        
        setProjects(formattedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    
    if (user && (user as any).role === "admin") {
      fetchProjects();
    }
  }, [user]);

  // Filter projects based on search query and status filter
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery.trim() === "" || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.entrepreneur.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.entrepreneur.companyName && project.entrepreneur.companyName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewConversation = (projectId: string, projectTitle: string) => {
    console.log('Navigating to conversation for project:', projectId, projectTitle);
    navigate(`/messages?projectId=${projectId}&projectTitle=${encodeURIComponent(projectTitle)}`);
  };

  const handleSelectStudents = (projectId: string, projectTitle: string, status: string) => {
    const mode = status === 'New' ? 'new' : 'proposals';
    navigate(`/student-selection?projectId=${projectId}&projectTitle=${encodeURIComponent(projectTitle)}&mode=${mode}`);
  };

  const refreshProjects = async () => {
    try {
      const { data: projectsData, error: fetchError } = await supabase
        .from('projects')
        .select(`
          id_project,
          title,
          description,
          status,
          created_at,
          entrepreneurs (
            id_entrepreneur,
            company_name,
            users (
              name,
              surname
            )
          )
        `)
        .order('created_at', { ascending: false });
        
      if (!fetchError && projectsData) {
        const formattedProjects: Project[] = projectsData.map(project => ({
          id: project.id_project,
          title: project.title,
          description: project.description || undefined,
          status: convertDbStatusToDisplay(project.status || 'STEP1'),
          created_at: project.created_at,
          entrepreneur: {
            name: `${project.entrepreneurs.users.name} ${project.entrepreneurs.users.surname}`,
            companyName: project.entrepreneurs.company_name || undefined,
          }
        }));
        
        setProjects(formattedProjects);
      }
    } catch (error) {
      console.error('Error refreshing projects:', error);
    }
  };

  const handleConfirmPayment = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: convertDisplayStatusToDb('Active') })
        .eq('id_project', projectId);
        
      if (error) throw error;
      
      toast.success("Payment confirmed. Project is now active.");
      await refreshProjects();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error("Failed to confirm payment");
    }
  };

  const handleCompleteProject = async (projectId: string) => {
    try {
      // Update project status to completed
      const { error: statusError } = await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id_project', projectId);
        
      if (statusError) throw statusError;
      
      // Handle student availability when project is completed
      await StudentAvailabilityService.handleProjectCompletion(projectId);
      
      toast.success("Project marked as completed. Student is now available for new projects.");
      await refreshProjects();
    } catch (error) {
      console.error('Error completing project:', error);
      toast.error("Failed to complete project");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
  };

  const statusOptions = ['New', 'Proposals', 'Selection', 'Payment', 'Active', 'In progress'];

  if (!user || (user as any).role !== "admin") {
    return null; // Will redirect in the useEffect
  }

  return (
    <AppLayout>
      <div className="h-full overflow-auto">
        <div className="max-w-full p-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">Manage projects and student assignments</p>
            </div>
            <Button onClick={() => navigate('/new-project')} className="flex items-center w-fit text-sm h-9" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Create New Project
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">{projects.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">
                  {projects.filter(p => p.status === 'Active' || p.status === 'In progress').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium">Pending Projects</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">
                  {projects.filter(p => p.status === 'New' || p.status === 'Proposals' || p.status === 'Selection').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">All Projects</CardTitle>
              <CardDescription className="text-sm">Manage project statuses and student assignments</CardDescription>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] h-9 text-sm">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(searchQuery || statusFilter) && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 text-sm">
                      <Filter className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm min-w-[200px]">Project Title</TableHead>
                        <TableHead className="hidden md:table-cell text-sm min-w-[150px]">Entrepreneur</TableHead>
                        <TableHead className="hidden sm:table-cell text-sm min-w-[100px]">Status</TableHead>
                        <TableHead className="hidden lg:table-cell text-sm min-w-[100px]">Created</TableHead>
                        <TableHead className="text-sm min-w-[250px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map(project => (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-semibold text-sm">{project.title}</div>
                                {project.description && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {project.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div>
                                <div className="font-medium text-sm">{project.entrepreneur.name}</div>
                                {project.entrepreneur.companyName && (
                                  <div className="text-xs text-muted-foreground">
                                    {project.entrepreneur.companyName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge className={`${getStatusColor(project.status)} text-xs`}>
                                {project.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs">
                              {new Date(project.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewConversation(project.id, project.title)}
                                  className="flex items-center text-xs h-8"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">View Conversation</span>
                                  <span className="sm:hidden">Chat</span>
                                </Button>
                                
                                {(project.status === 'New' || project.status === 'Proposals') && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSelectStudents(project.id, project.title, project.status)}
                                    className="flex items-center text-xs h-8"
                                  >
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">
                                      {project.status === 'New' ? 'Select Students' : 'Select from Accepted'}
                                    </span>
                                    <span className="sm:hidden">Select</span>
                                  </Button>
                                )}
                                
                                {project.status === 'Payment' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="default" 
                                        size="sm"
                                        className="flex items-center bg-green-600 hover:bg-green-700 text-xs h-8"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Confirm Payment</span>
                                        <span className="sm:hidden">Confirm</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to confirm the payment for "{project.title}"? This will activate the project and notify all parties.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleConfirmPayment(project.id)}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          Confirm Payment
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                
                                {(project.status === 'Active' || project.status === 'In progress') && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="default" 
                                        size="sm"
                                        className="flex items-center bg-purple-600 hover:bg-purple-700 text-xs h-8"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Complete Project</span>
                                        <span className="sm:hidden">Complete</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Complete Project</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to mark "{project.title}" as completed? This will make the assigned student available for new projects and cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleCompleteProject(project.id)}
                                          className="bg-purple-600 hover:bg-purple-700"
                                        >
                                          Complete Project
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-sm">
                            {projects.length > 0 
                              ? "No projects match the search criteria" 
                              : "No projects found"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Admin;
