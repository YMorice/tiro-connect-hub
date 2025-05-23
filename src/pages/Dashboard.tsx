import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import { useMessages } from "@/context/message-context";
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
  FileText, 
  MessageSquare, 
  User,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import StudentReviewsTable from "@/components/student/StudentReviewsTable";

const Dashboard = () => {
  const { user } = useAuth();
  const { setProjects } = useProjects();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dbProjects, setDbProjects] = useState([]);
  const [dbMessages, setDbMessages] = useState([]);
  const [entrepreneurId, setEntrepreneurId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  
  // Fetch data from the database when the component mounts
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching data for user:", user);
        
        // Get role-specific IDs first
        if (user.role === 'entrepreneur') {
          // Get entrepreneur ID from user ID
          const { data: entrepreneurData, error: entrepreneurError } = await supabase
            .from('entrepreneurs')
            .select('id_entrepreneur')
            .eq('id_user', user.id)
            .single();
            
          if (entrepreneurError) {
            console.error("Error fetching entrepreneur ID:", entrepreneurError);
          } else if (entrepreneurData) {
            console.log("Entrepreneur data:", entrepreneurData);
            setEntrepreneurId(entrepreneurData.id_entrepreneur);
            
            // Now fetch projects with entrepreneur ID
            const { data: projectData, error: projectError } = await supabase
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
              .eq('id_entrepreneur', entrepreneurData.id_entrepreneur);
              
            if (projectError) {
              console.error("Error fetching projects:", projectError);
            } else {
              console.log("Fetched projects:", projectData);
              setDbProjects(projectData || []);
            }
          }
        } else if (user.role === 'student') {
          // Get student ID from user ID
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('id_student')
            .eq('id_user', user.id)
            .single();
            
          if (studentError) {
            console.error("Error fetching student ID:", studentError);
          } else if (studentData) {
            console.log("Student data:", studentData);
            setStudentId(studentData.id_student);
            
            // Fetch project assignments for this student
            const { data: assignmentData, error: assignmentError } = await supabase
              .from('project_assignments')
              .select(`
                id_assignment,
                id_project,
                id_student,
                status,
                created_at
              `)
              .eq('id_student', studentData.id_student);
              
            if (assignmentError) {
              console.error("Error fetching project assignments:", assignmentError);
            } else if (assignmentData && assignmentData.length > 0) {
              console.log("Fetched project assignments:", assignmentData);
              
              // Fetch the actual projects
              const projectIds = assignmentData.map(a => a.id_project);
              const { data: projectData, error: projectError } = await supabase
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
                .in('id_project', projectIds);
                
              if (projectError) {
                console.error("Error fetching assigned projects:", projectError);
              } else {
                console.log("Fetched assigned projects:", projectData);
                setDbProjects(projectData || []);
              }
            }
            
            // Also fetch open projects for student to apply to
            const { data: openProjects, error: openProjectsError } = await supabase
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
              .eq('status', 'open');
              
            if (openProjectsError) {
              console.error("Error fetching open projects:", openProjectsError);
            } else {
              console.log("Fetched open projects:", openProjects);
              // Add open projects to state if not already in assigned projects
              const assignedProjectIds = new Set(dbProjects.map(p => p.id_project));
              const newOpenProjects = (openProjects || []).filter(p => !assignedProjectIds.has(p.id_project));
              setDbProjects(prev => [...prev, ...newOpenProjects]);
            }
          }
        }
        
        // Fetch messages for all users
        const { data: messagesData, error: messagesError } = await supabase
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
          .limit(10);
          
        if (messagesError) {
          console.error("Error fetching messages:", messagesError);
        } else {
          console.log("Fetched messages:", messagesData);
          setDbMessages(messagesData || []);
        }
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, setProjects]);

  // Calculate statistics based on fetched projects
  const totalProjects = dbProjects.length;
  const completedProjects = dbProjects.filter(p => p.status === 'completed').length;
  const unreadMessages = dbMessages.filter(m => !m.read).length;
  
  const openProjects = dbProjects.filter(p => p.status === 'open');

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
                  {user?.role === "entrepreneur" ? totalProjects : openProjects.length}
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
                <div className="text-3xl font-bold">{completedProjects}</div>
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
                      {/* Mock earnings for now */}
                      {dbProjects.filter(p => p.status === 'completed').length * 500}
                    </>
                  ) : (
                    <>
                      <MessageSquare className="inline mr-1 h-6 w-6 text-blue-600" />
                      {unreadMessages}
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
                  {openProjects.length > 0 ? (
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
                          {openProjects.slice(0, 3).map((project) => (
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
                      {openProjects.length > 3 && (
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
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Your Projects</CardTitle>
                  <CardDescription>Status of your current projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {dbProjects.length > 0 ? (
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
                          {dbProjects.slice(0, 5).map((project) => (
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
                      {dbProjects.length > 5 && (
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
              
              {/* Student Reviews Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Reviews</CardTitle>
                  <CardDescription>Your reviews of students who worked on your projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <StudentReviewsTable />
                </CardContent>
              </Card>
            </>
          )}

          {/* Common components for both roles */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Messages with online status */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
                <CardDescription>Your conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {dbMessages.length > 0 ? (
                  <div className="space-y-4">
                    {dbMessages.slice(0, 5).map((message) => (
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

            {/* Recent Documents - Could populate from database in the future */}
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
