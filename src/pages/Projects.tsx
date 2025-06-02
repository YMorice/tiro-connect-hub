
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
import { toast } from "@/components/ui/sonner";
import { Plus, Search, Eye, MessageCircle, Filter, Calendar, User } from "lucide-react";
import { ProposedStudentsDisplay } from "@/components/student-selection/ProposedStudentsDisplay";

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  pack?: {
    name: string;
    price?: number;
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

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Get the current user's entrepreneur profile
        const { data: entrepreneurData, error: entrepreneurError } = await supabase
          .from('entrepreneurs')
          .select('id_entrepreneur')
          .eq('id_user', user.id)
          .single();
          
        if (entrepreneurError) {
          console.error('Error fetching entrepreneur:', entrepreneurError);
          toast.error("Error loading user profile");
          return;
        }
        
        const { data: projectsData, error } = await supabase
          .from('projects')
          .select(`
            id_project,
            title,
            description,
            status,
            created_at,
            project_packs (
              name,
              price
            )
          `)
          .eq('id_entrepreneur', entrepreneurData.id_entrepreneur)
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
          pack: project.project_packs ? {
            name: project.project_packs.name,
            price: project.project_packs.price
          } : undefined
        }));
        
        setProjects(formattedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [user]);

  // Filter projects based on search query and status filter
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery.trim() === "" || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleViewConversation = (projectId: string, projectTitle: string) => {
    navigate(`/messages?projectId=${projectId}&projectTitle=${encodeURIComponent(projectTitle)}`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const handleStudentSelected = (studentId: string) => {
    // Refresh projects after student selection
    const fetchProjects = async () => {
      if (!user) return;

      try {
        const { data: entrepreneurData, error: entrepreneurError } = await supabase
          .from('entrepreneurs')
          .select('id_entrepreneur')
          .eq('id_user', user.id)
          .single();
          
        if (entrepreneurError) return;
        
        const { data: projectsData, error } = await supabase
          .from('projects')
          .select(`
            id_project,
            title,
            description,
            status,
            created_at,
            project_packs (
              name,
              price
            )
          `)
          .eq('id_entrepreneur', entrepreneurData.id_entrepreneur)
          .order('created_at', { ascending: false });
          
        if (!error && projectsData) {
          const formattedProjects: Project[] = projectsData.map(project => ({
            id: project.id_project,
            title: project.title,
            description: project.description || undefined,
            status: convertDbStatusToDisplay(project.status || 'STEP1'),
            created_at: project.created_at,
            pack: project.project_packs ? {
              name: project.project_packs.name,
              price: project.project_packs.price
            } : undefined
          }));
          
          setProjects(formattedProjects);
        }
      } catch (error) {
        console.error('Error refreshing projects:', error);
      }
    };
    
    fetchProjects();
  };

  const statusOptions = ['New', 'Proposals', 'Selection', 'Payment', 'Active', 'In progress'];

  return (
    <AppLayout>
      <div className="h-full overflow-auto">
        <div className="max-w-full p-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Projects</h1>
              <p className="text-muted-foreground text-sm">Manage and track your projects</p>
            </div>
            <Button onClick={() => navigate('/pack-selection')} className="flex items-center w-fit text-sm h-9" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Create New Project
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Filter Projects</CardTitle>
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
                      <SelectValue placeholder="All statuses" />
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
          </Card>

          {/* Projects List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.length > 0 ? (
                filteredProjects.map(project => (
                  <div key={project.id} className="space-y-3">
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{project.title}</CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {project.description || "No description provided"}
                            </CardDescription>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge className={`${getStatusColor(project.status)} text-xs`}>
                                {project.status}
                              </Badge>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(project.created_at).toLocaleDateString()}
                              </div>
                              {project.pack && (
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <span>{project.pack.name}</span>
                                  {project.pack.price && (
                                    <span className="ml-1">- €{project.pack.price}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewConversation(project.id, project.title)}
                              className="text-xs h-8"
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Chat
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewProject(project.id)}
                              className="text-xs h-8"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {(project.status === 'Selection' || project.status === 'Proposals') && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => toggleProjectExpansion(project.id)}
                                className="text-xs h-8"
                              >
                                <User className="h-3 w-3 mr-1" />
                                {expandedProject === project.id ? 'Hide' : 'Show'} Students
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    
                    {/* Proposed Students Display */}
                    {expandedProject === project.id && (project.status === 'Selection' || project.status === 'Proposals') && (
                      <ProposedStudentsDisplay 
                        projectId={project.id}
                        projectStatus={project.status}
                        isEntrepreneur={true}
                        onStudentSelected={handleStudentSelected}
                      />
                    )}
                  </div>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground text-sm">
                      {projects.length > 0 
                        ? "No projects match your search criteria" 
                        : "You haven't created any projects yet"}
                    </p>
                    {projects.length === 0 && (
                      <Button 
                        onClick={() => navigate('/pack-selection')} 
                        className="mt-3 text-sm h-9"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Your First Project
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Projects;
