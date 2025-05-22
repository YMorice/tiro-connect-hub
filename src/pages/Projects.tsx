
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
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
  const { projects, setProjects } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Fetch projects from database
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        let query = supabase
          .from('projects')
          .select(`
            id_project,
            title,
            description,
            status,
            created_at,
            updated_at,
            id_entrepreneur,
            id_pack
          `);
          
        if (user.role === "entrepreneur") {
          // Entrepreneurs only see their own projects
          query = query.eq('id_entrepreneur', user.id);
        } else if (user.role === "student") {
          // Students see projects that are assigned to them or open
          // This needs to be enhanced with proper project assignments
          query = query.or(`status.eq.open,id_project.in.(${getAssignedProjectIds()})`);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        if (data) {
          // Convert to the format expected by the UI
          const formattedProjects: Project[] = data.map(dbProject => ({
            id: dbProject.id_project,
            title: dbProject.title,
            description: dbProject.description || "",
            status: dbProject.status as any || "draft",
            ownerId: dbProject.id_entrepreneur,
            tasks: [],  // We'll need to fetch these separately in a real implementation
            documents: [],  // We'll need to fetch these separately in a real implementation
            createdAt: new Date(dbProject.created_at),
            updatedAt: new Date(dbProject.updated_at),
            packId: dbProject.id_pack
          }));
          
          setProjects(formattedProjects);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    
    // Helper function to get projects assigned to the current student
    const getAssignedProjectIds = () => {
      // This would be implemented to fetch from project_assignments table
      // For now, return a dummy query part
      return "select id_project from project_assignments where id_student = '" + user?.id + "'";
    };
    
    if (user) {
      fetchProjects();
    }
  }, [user, setProjects]);

  // Filter projects based on user role, search term and status
  const filteredProjects = projects.filter((project) => {
    // Filter by search term
    const searchFilter = 
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    const statusMatch = 
      statusFilter === "all" || project.status === statusFilter;
    
    return searchFilter && statusMatch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Projects</h1>
          {user?.role === "entrepreneur" && (
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full sm:w-1/3">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
                              project.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : project.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : project.status === "open"
                                ? "bg-yellow-100 text-yellow-800"
                                : project.status === "review"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {project.status.replace("_", " ").toUpperCase()}
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
                          <div className="text-sm">
                            <span className="text-muted-foreground">Tasks: </span>
                            <span>{project.tasks.length}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Files: </span>
                            <span>{project.documents.length}</span>
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
                    : user?.role === "entrepreneur"
                    ? "Create your first project to get started"
                    : "Browse open projects to start working"}
                </p>
                {user?.role === "entrepreneur" && !searchTerm && statusFilter === "all" && (
                  <Button className="mt-4" asChild>
                    <Link to="/projects/new">Create Project</Link>
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
