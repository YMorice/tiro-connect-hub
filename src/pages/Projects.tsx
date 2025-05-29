
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Project } from "@/types";

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      console.log("Fetching projects for user:", user.id, "with role:", (user as any).role);
      
      let projectData: any[] = [];
      
      if ((user as any).role === "entrepreneur") {
        // Get entrepreneur data and projects
        const { data, error } = await supabase
          .from('entrepreneurs')
          .select(`
            id_entrepreneur,
            projects (
              id_project,
              title,
              description,
              status,
              created_at,
              updated_at,
              id_pack,
              selected_student
            )
          `)
          .eq('id_user', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching entrepreneur projects:', error);
          return;
        }
        
        projectData = data?.projects || [];
      } else if ((user as any).role === "student") {
        // Get student data and check for accepted proposals
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id_student')
          .eq('id_user', user.id)
          .single();
          
        if (studentError) {
          console.error('Error fetching student data:', studentError);
          return;
        }
        
        if (studentData) {
          // Get projects where this student has accepted proposals or is selected
          const [acceptedProposalsResult, selectedProjectsResult, openProjectsResult] = await Promise.all([
            supabase
              .from('proposal_to_student')
              .select(`
                id_project,
                projects (
                  id_project,
                  title,
                  description,
                  status,
                  created_at,
                  updated_at,
                  id_entrepreneur,
                  id_pack,
                  selected_student
                )
              `)
              .eq('id_student', studentData.id_student)
              .eq('accepted', true),
            
            supabase
              .from('projects')
              .select('*')
              .eq('selected_student', studentData.id_student),
            
            supabase
              .from('projects')
              .select('*')
              .in('status', ['STEP1', 'STEP2'])
          ]);
          
          const acceptedProjects = acceptedProposalsResult.data?.map(p => p.projects).filter(Boolean) || [];
          const selectedProjects = selectedProjectsResult.data || [];
          const openProjects = openProjectsResult.data || [];
          
          // Combine and remove duplicates
          const allProjectIds = new Set();
          projectData = [];
          
          [...acceptedProjects, ...selectedProjects, ...openProjects].forEach(project => {
            if (project && !allProjectIds.has(project.id_project)) {
              allProjectIds.add(project.id_project);
              projectData.push(project);
            }
          });
        }
      } else if ((user as any).role === "admin") {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching admin projects:', error);
          return;
        }
        
        projectData = data || [];
      }
      
      // Convert to UI format
      const formattedProjects: Project[] = projectData.map(dbProject => ({
        id: dbProject.id_project,
        title: dbProject.title,
        description: dbProject.description || "",
        status: dbProject.status as any || "draft",
        ownerId: dbProject.id_entrepreneur,
        assigneeId: dbProject.selected_student,
        tasks: [],
        documents: [],
        createdAt: new Date(dbProject.created_at),
        updatedAt: new Date(dbProject.updated_at),
        packId: dbProject.id_pack
      }));
      
      setProjects(formattedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [user?.id, (user as any)?.role]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Memoized filtered projects to prevent unnecessary recalculations
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const searchMatch = 
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        project.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = 
        statusFilter === "all" || project.status === statusFilter;
      
      return searchMatch && statusMatch;
    });
  }, [projects, searchTerm, statusFilter]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Projects</h1>
          {(user as any)?.role === "entrepreneur" && (
            <Button
              asChild
              className="bg-tiro-purple hover:bg-tiro-purple/90"
            >
              <Link to="/projects/pack-selection">Create New Project</Link>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-2/3">
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
          <div className="w-full sm:w-1/3">
            <Select
              value={statusFilter}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="STEP1">New Project</SelectItem>
                <SelectItem value="STEP2">Awaiting Student Acceptance</SelectItem>
                <SelectItem value="STEP3">Awaiting Entrepreneur Selection</SelectItem>
                <SelectItem value="STEP4">Awaiting Payment</SelectItem>
                <SelectItem value="STEP5">In Progress</SelectItem>
                <SelectItem value="STEP6">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tiro-purple"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <Card key={project.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xl">{project.title}</h3>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              project.status === "STEP6"
                                ? "bg-green-100 text-green-800"
                                : project.status === "STEP5"
                                ? "bg-blue-100 text-blue-800"
                                : project.status === "STEP2"
                                ? "bg-yellow-100 text-yellow-800"
                                : project.status === "STEP3" || project.status === "STEP4"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {project.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {project.description.substring(0, 150)}
                          {project.description.length > 150 && "..."}
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Created: </span>
                            <span>{project.createdAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button asChild>
                        <Link to={`/projects/${project.id}`}>View Project</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center p-10">
                <h3 className="text-lg font-medium">No projects found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "Try changing your search filters"
                    : (user as any)?.role === "entrepreneur"
                    ? "Create your first project to get started"
                    : "Browse open projects to start working"}
                </p>
                {(user as any)?.role === "entrepreneur" && !searchTerm && statusFilter === "all" && (
                  <Button className="mt-4" asChild>
                    <Link to="/projects/pack-selection">Create Project</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Projects;
