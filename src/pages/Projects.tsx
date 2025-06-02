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
import { Check, X, Plus } from "lucide-react";

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

interface ProjectWithProposal extends Project {
  proposalStatus?: 'pending' | 'accepted' | 'declined';
  proposalId?: string;
}

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithProposal[]>([]);
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
        // Get student data
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
          // Get projects where this student has proposals that are NOT declined (null or accepted)
          // or where they are the selected student
          const [proposalsResult, selectedProjectsResult] = await Promise.all([
            supabase
              .from('proposal_to_student')
              .select(`
                id_proposal,
                accepted,
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
              .or('accepted.is.null,accepted.eq.true'), // Only show pending (null) or accepted proposals
            
            supabase
              .from('projects')
              .select('*')
              .eq('selected_student', studentData.id_student)
          ]);
          
          console.log('Proposals result:', proposalsResult);
          console.log('Selected projects result:', selectedProjectsResult);
          
          const proposalProjects = proposalsResult.data?.map(p => ({
            ...p.projects,
            proposalStatus: p.accepted === null ? 'pending' : (p.accepted ? 'accepted' : 'declined'),
            proposalId: p.id_proposal
          })).filter(Boolean) || [];
          
          const selectedProjects = selectedProjectsResult.data || [];
          
          // Combine and remove duplicates
          const allProjectIds = new Set();
          projectData = [];
          
          [...proposalProjects, ...selectedProjects].forEach(project => {
            if (project && !allProjectIds.has(project.id_project)) {
              allProjectIds.add(project.id_project);
              projectData.push(project);
            }
          });
          
          console.log('Final project data for student:', projectData);
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
      const formattedProjects: ProjectWithProposal[] = projectData.map(dbProject => ({
        id: dbProject.id_project,
        title: dbProject.title,
        description: dbProject.description || "",
        status: convertDbStatusToDisplay(dbProject.status || "STEP1") as any,
        ownerId: dbProject.id_entrepreneur,
        assigneeId: dbProject.selected_student,
        tasks: [],
        documents: [],
        createdAt: new Date(dbProject.created_at),
        updatedAt: new Date(dbProject.updated_at),
        packId: dbProject.id_pack,
        proposalStatus: dbProject.proposalStatus,
        proposalId: dbProject.proposalId
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

  // Handle proposal response (accept/decline)
  const handleProposalResponse = async (proposalId: string, accepted: boolean) => {
    try {
      const { error } = await supabase
        .from('proposal_to_student')
        .update({ accepted })
        .eq('id_proposal', proposalId);
        
      if (error) {
        throw error;
      }
      
      toast.success(accepted ? "Proposal accepted!" : "Proposal declined");
      
      // Refresh projects to update the status or remove declined projects
      fetchProjects();
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error("Failed to update proposal");
    }
  };

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
      <div className="p-4 lg:p-6 space-y-6 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold">Projects</h1>
          {(user as any)?.role === "entrepreneur" && (
            <Button
              asChild
              className="bg-tiro-primary hover:bg-tiro-primary/90 w-full sm:w-auto"
            >
              <Link to="/projects/pack-selection" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create New Project</span>
                <span className="sm:hidden">New Project</span>
              </Link>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-2/3">
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
          <div className="w-full lg:w-1/3">
            <Select
              value={statusFilter}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Proposals">Proposals</SelectItem>
                <SelectItem value="Selection">Selection</SelectItem>
                <SelectItem value="Payment">Payment</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="In progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tiro-primary"></div>
          </div>
        ) : (
          <div className="grid gap-4 lg:gap-6">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex flex-col gap-4">
                      {/* Project Title and Status */}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <h3 className="font-bold text-lg lg:text-xl flex-1 min-w-0 break-words">
                            {project.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                project.status === "In progress"
                                  ? "bg-green-100 text-green-800"
                                  : project.status === "Active"
                                  ? "bg-blue-100 text-blue-800"
                                  : project.status === "Proposals"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : project.status === "Selection" || project.status === "Payment"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {project.status}
                            </span>
                            {project.proposalStatus && (
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  project.proposalStatus === "accepted"
                                    ? "bg-green-100 text-green-800"
                                    : project.proposalStatus === "declined"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                Proposal: {project.proposalStatus}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-muted-foreground text-sm lg:text-base break-words">
                          {project.description.substring(0, 200)}
                          {project.description.length > 200 && "..."}
                        </p>
                        
                        {/* Created Date */}
                        <div className="text-xs lg:text-sm">
                          <span className="text-muted-foreground">Created: </span>
                          <span>{project.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        {/* Student proposal buttons */}
                        {(user as any)?.role === "student" && project.proposalStatus === "pending" && (
                          <>
                            <Button
                              onClick={() => handleProposalResponse(project.proposalId!, true)}
                              className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              onClick={() => handleProposalResponse(project.proposalId!, false)}
                              variant="destructive"
                              className="flex-1 sm:flex-none"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}
                        <Button asChild className="flex-1 sm:flex-none">
                          <Link to={`/project/${project.id}`}>View Project</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center p-6 lg:p-10">
                <h3 className="text-base lg:text-lg font-medium mb-2">No projects found</h3>
                <p className="text-muted-foreground text-sm lg:text-base mb-4">
                  {searchTerm || statusFilter !== "all"
                    ? "Try changing your search filters"
                    : (user as any)?.role === "entrepreneur"
                    ? "Create your first project to get started"
                    : (user as any)?.role === "student" 
                    ? "You'll see projects here when you receive proposals or are working on them"
                    : "Browse open projects to start working"}
                </p>
                {(user as any)?.role === "entrepreneur" && !searchTerm && statusFilter === "all" && (
                  <Button className="w-full sm:w-auto" asChild>
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
