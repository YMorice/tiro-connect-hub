
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Calendar, DollarSign, User } from "lucide-react";
import { Link } from "react-router-dom";

interface Project {
  id_project: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  price: number;
  proposalStatus?: 'pending' | 'accepted' | 'declined';
  entrepreneur?: {
    users: {
      name: string;
    };
  };
}

const Projects = () => {
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statusOptions = [
    { value: "all", label: "All Projects" },
    { value: "STEP1", label: "New" },
    { value: "STEP2", label: "Proposals" },
    { value: "STEP3", label: "Selection" },
    { value: "STEP4", label: "Payment" },
    { value: "STEP5", label: "Active" },
    { value: "STEP6", label: "In Progress" },
    { value: "completed", label: "Completed" }
  ];

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [projects, searchTerm, statusFilter]);

  const fetchProjects = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("Fetching projects for user:", user.id, "role:", (user as any)?.role);
      
      const userRole = (user as any)?.role;
      
      if (userRole === "entrepreneur") {
        // Entrepreneurs see only their own projects
        const { data: entrepreneurData } = await supabase
          .from("entrepreneurs")
          .select("id_entrepreneur")
          .eq("id_user", user.id)
          .single();
          
        if (entrepreneurData) {
          const { data, error } = await supabase
            .from("projects")
            .select(`
              *,
              entrepreneurs (
                users (name)
              )
            `)
            .eq("id_entrepreneur", entrepreneurData.id_entrepreneur)
            .order("created_at", { ascending: false });

          if (error) {
            console.error("Error fetching entrepreneur projects:", error);
            throw error;
          }

          console.log("Entrepreneur projects fetched:", data?.length || 0);
          const sortedProjects = sortProjectsByStatus(data || []);
          setProjects(sortedProjects);
        }
      } else if (userRole === "student") {
        // Students see only projects proposed to them
        const { data: studentData } = await supabase
          .from("students")
          .select("id_student")
          .eq("id_user", user.id)
          .single();
          
        if (studentData) {
          // Get projects with proposals for this student
          const { data: proposalData, error: proposalError } = await supabase
            .from('proposal_to_student')
            .select(`
              id_proposal,
              accepted,
              projects (
                *,
                entrepreneurs (
                  users (name)
                )
              )
            `)
            .eq('id_student', studentData.id_student);
          
          if (proposalError) {
            console.error("Error fetching student proposals:", proposalError);
            throw proposalError;
          }

          const projectsWithProposals = proposalData?.map(p => ({
            ...p.projects,
            proposalStatus: p.accepted === null ? 'pending' : (p.accepted ? 'accepted' : 'declined')
          })).filter(Boolean) || [];

          console.log("Student projects fetched:", projectsWithProposals.length);
          const sortedProjects = sortProjectsByStatus(projectsWithProposals);
          setProjects(sortedProjects);
        }
      } else if (userRole === "admin") {
        // Admins see all projects
        const { data, error } = await supabase
          .from("projects")
          .select(`
            *,
            entrepreneurs (
              users (name)
            )
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching admin projects:", error);
          throw error;
        }

        console.log("Admin projects fetched:", data?.length || 0);
        const sortedProjects = sortProjectsByStatus(data || []);
        setProjects(sortedProjects);
      }
      
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const sortProjectsByStatus = (projectsList: Project[]) => {
    const statusPriority: { [key: string]: number } = {
      'STEP1': 1,  // New
      'STEP2': 2,  // Proposals
      'STEP3': 3,  // Selection
      'STEP4': 4,  // Payment
      'STEP5': 5,  // Active
      'STEP6': 6,  // In Progress
      'completed': 7,
      'open': 1,   // Fallback for legacy status
      'in_progress': 6,  // Fallback for legacy status
    };

    return [...projectsList].sort((a, b) => {
      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;
      
      // First sort by status priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then sort by creation date (newest first) within the same status
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const applyFilters = () => {
    let filtered = projects;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "step1":
      case "open": 
        return "bg-yellow-100 text-yellow-800";
      case "step2": 
        return "bg-blue-100 text-blue-800";
      case "step3": 
        return "bg-purple-100 text-purple-800";
      case "step4": 
        return "bg-orange-100 text-orange-800";
      case "step5": 
        return "bg-green-100 text-green-800";
      case "step6":
      case "in_progress": 
        return "bg-indigo-100 text-indigo-800";
      case "completed": 
        return "bg-gray-100 text-gray-800";
      default: 
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'STEP1': 'New',
      'STEP2': 'Proposals',
      'STEP3': 'Selection',
      'STEP4': 'Payment',
      'STEP5': 'Active',
      'STEP6': 'In Progress',
      'open': 'Open',
      'in_progress': 'In Progress',
      'completed': 'Completed'
    };
    return statusMap[status] || status?.replace('_', ' ').toUpperCase() || 'Unknown';
  };

  const canCreateProject = () => {
    return (user as any)?.role === "entrepreneur";
  };

  const userRole = (user as any)?.role;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Page Header with Title and Create Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projects</h1>
              <p className="text-gray-600 mt-1">
                {userRole === "student" && "Projects proposed to you"}
                {userRole === "entrepreneur" && "Your projects"}
                {userRole === "admin" && "All projects in the system"}
              </p>
            </div>
            {canCreateProject() && (
              <Button asChild className="bg-tiro-primary hover:bg-tiro-primary/90">
                <Link to="/new-project">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </Button>
            )}
          </div>

          {/* Search and Filter Controls */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiro-primary focus:border-transparent bg-white min-w-[160px]"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Projects Grid */}
          {loading ? (
            /* Loading State */
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-primary"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">
                {searchTerm || statusFilter !== "all" 
                  ? "No projects match your filters" 
                  : userRole === "student"
                  ? "No projects have been proposed to you yet"
                  : "No projects found"
                }
              </div>
              {canCreateProject() && !searchTerm && statusFilter === "all" && (
                <Button asChild className="mt-4 bg-tiro-primary hover:bg-tiro-primary/90">
                  <Link to="/new-project">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            /* Projects Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id_project}
                  to={`/projects/${project.id_project}`}
                  className="block"
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${getStatusColor(project.status)} text-xs`}>
                            {getStatusDisplay(project.status)}
                          </Badge>
                          {project.proposalStatus && (
                            <Badge 
                              variant={project.proposalStatus === 'pending' ? 'default' : 
                                      project.proposalStatus === 'accepted' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {project.proposalStatus}
                            </Badge>
                          )}
                        </div>
                        {project.price && (
                          <div className="flex items-center text-sm text-tiro-primary font-semibold">
                            <DollarSign className="h-4 w-4 mr-1" />
                            €{project.price.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-lg font-semibold line-clamp-2 min-h-[3.5rem]">
                        {project.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4 min-h-[4.5rem]">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(project.created_at).toLocaleDateString()}
                        </div>
                        {project.entrepreneur?.users?.name && (
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {project.entrepreneur.users.name}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Projects;
