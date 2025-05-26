import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  BadgeDollarSign, 
  MessageSquare, 
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import StudentReviewsTable from "@/components/student/StudentReviewsTable";

interface DashboardData {
  projects: any[];
  messages: any[];
  entrepreneurId: string | null;
  studentId: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { setProjects } = useProjects();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    projects: [],
    messages: [],
    entrepreneurId: null,
    studentId: null
  });
  
  // Memoize computed values to prevent unnecessary recalculations
  const stats = useMemo(() => {
    const totalProjects = dashboardData.projects.length;
    const completedProjects = dashboardData.projects.filter(p => p.status === 'completed').length;
    const openProjects = dashboardData.projects.filter(p => p.status === 'open');
    const unreadMessages = dashboardData.messages.filter(m => !m.read).length;
    
    return {
      totalProjects,
      completedProjects,
      openProjects,
      unreadMessages
    };
  }, [dashboardData]);
  
  // Fetch all dashboard data in a single useEffect to prevent cascading requests
  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log("Fetching dashboard data for user:", user.id);
        
        const queries = [];
        let entrepreneurId = null;
        let studentId = null;
        
        // Get role-specific IDs first
        if (user.role === 'entrepreneur') {
          const { data: entrepreneurData } = await supabase
            .from('entrepreneurs')
            .select('id_entrepreneur')
            .eq('id_user', user.id)
            .single();
            
          if (entrepreneurData) {
            entrepreneurId = entrepreneurData.id_entrepreneur;
            
            // Fetch entrepreneur's projects
            queries.push(
              supabase
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
                `)
                .eq('id_entrepreneur', entrepreneurData.id_entrepreneur)
            );
          }
        } else if (user.role === 'student') {
          const { data: studentData } = await supabase
            .from('students')
            .select('id_student')
            .eq('id_user', user.id)
            .single();
            
          if (studentData) {
            studentId = studentData.id_student;
            
            // Fetch assigned projects and open projects in parallel
            queries.push(
              supabase
                .from('project_assignments')
                .select(`
                  id_project,
                  projects(
                    id_project,
                    title,
                    description,
                    status,
                    created_at,
                    updated_at,
                    id_entrepreneur,
                    id_pack
                  )
                `)
                .eq('id_student', studentData.id_student),
              
              supabase
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
                `)
                .eq('status', 'open')
            );
          }
        }
        
        // Fetch messages for all users
        queries.push(
          supabase
            .from('messages')
            .select(`
              id_message,
              content,
              read,
              created_at,
              project_id,
              sender_id,
              users!sender_id(name)
            `)
            .order('created_at', { ascending: false })
            .limit(10)
        );
        
        // Execute all queries in parallel
        const results = await Promise.allSettled(queries);
        
        let projects: any[] = [];
        let messages: any[] = [];
        
        // Process results based on user role
        if (user.role === 'entrepreneur') {
          const projectsResult = results[0];
          if (projectsResult.status === 'fulfilled' && projectsResult.value.data) {
            projects = projectsResult.value.data;
          }
          
          const messagesResult = results[1];
          if (messagesResult.status === 'fulfilled' && messagesResult.value.data) {
            messages = messagesResult.value.data;
          }
        } else if (user.role === 'student') {
          // Combine assigned and open projects
          const assignedResult = results[0];
          const openResult = results[1];
          const messagesResult = results[2];
          
          if (assignedResult.status === 'fulfilled' && assignedResult.value.data) {
            projects = assignedResult.value.data.map((a: any) => a.projects).filter(Boolean);
          }
          
          if (openResult.status === 'fulfilled' && openResult.value.data) {
            const assignedProjectIds = new Set(projects.map(p => p.id_project));
            const newOpenProjects = openResult.value.data.filter((p: any) => !assignedProjectIds.has(p.id_project));
            projects = [...projects, ...newOpenProjects];
          }
          
          if (messagesResult.status === 'fulfilled' && messagesResult.value.data) {
            messages = messagesResult.value.data;
          }
        }
        
        setDashboardData({
          projects,
          messages,
          entrepreneurId,
          studentId
        });
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user?.id, user?.role]); // Only depend on user ID and role

  return (
    <AppLayout>
      {loading ? (
        <div className="flex justify-center items-center h-80">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tiro-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
            {user?.role === "entrepreneur" && (
              <Button
                onClick={() => navigate("/projects/new")}
                className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
              >
                Create New Project
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {user?.role === "entrepreneur" ? "Total Projects" : "Available Proposals"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {user?.role === "entrepreneur" ? stats.totalProjects : stats.openProjects.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.completedProjects}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {user?.role === "student" ? "Total Earnings" : "Unread Messages"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center">
                  {user?.role === "student" ? (
                    <>
                      <BadgeDollarSign className="inline mr-1 h-6 w-6 text-green-600" />
                      {stats.completedProjects * 500}
                    </>
                  ) : (
                    <>
                      <MessageSquare className="inline mr-1 h-6 w-6 text-blue-600" />
                      {stats.unreadMessages}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student-specific content */}
          {user?.role === "student" && (
            <>
              {/* Project Proposals */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Proposals</CardTitle>
                  <CardDescription>Available projects you can apply for</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.openProjects.length > 0 ? (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.openProjects.slice(0, 3).map((project) => (
                            <TableRow key={project.id_project}>
                              <TableCell className="font-medium">{project.title}</TableCell>
                              <TableCell>
                                {project.description?.substring(0, 50)}
                                {project.description?.length > 50 && "..."}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <Link to={`/projects/${project.id_project}`}>View Details</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {stats.openProjects.length > 3 && (
                        <div className="mt-4 text-center">
                          <Button variant="outline" asChild>
                            <Link to="/projects">View All Proposals</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No project proposals available at the moment.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Reviews</CardTitle>
                  <CardDescription>Feedback from your completed projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <StudentReviewsTable />
                </CardContent>
              </Card>
            </>
          )}

          {/* Entrepreneur-specific content */}
          {user?.role === "entrepreneur" && (
            <Card>
              <CardHeader>
                <CardTitle>Your Projects</CardTitle>
                <CardDescription>Status of your current projects</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.projects.length > 0 ? (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.projects.slice(0, 5).map((project) => (
                          <TableRow key={project.id_project}>
                            <TableCell className="font-medium">{project.title}</TableCell>
                            <TableCell>
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
                            </TableCell>
                            <TableCell>
                              {new Date(project.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/projects/${project.id_project}`}>View</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {dashboardData.projects.length > 5 && (
                      <div className="mt-4 text-center">
                        <Button variant="outline" asChild>
                          <Link to="/projects">View All Projects</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No projects found.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Common components for both roles */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Messages */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
                <CardDescription>Your conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.messages.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.messages.slice(0, 5).map((message) => (
                      <div
                        key={message.id_message}
                        className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center">
                          <div className="relative mr-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User size={20} />
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">{message.users?.name || "User"}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[180px]">
                              {message.content}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/messages">
                            <MessageSquare className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" asChild className="w-full mt-2">
                      <Link to="/messages">View All Messages</Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No messages yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>Latest files from your projects</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No documents available.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
