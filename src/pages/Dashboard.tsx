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
  Star,
  Circle,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { messages } = useMessages();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Fetch data from the database when the component mounts
  useEffect(() => {
    if (!user) return;
    
    // Fetch data from the database
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch projects for the current user
        if (user.role === 'entrepreneur') {
          // Get entrepreneur ID from user ID
          const { data: entrepreneurData, error: entrepreneurError } = await supabase
            .from('entrepreneurs')
            .select('id_entrepreneur')
            .eq('id_user', user.id)
            .single();
            
          if (entrepreneurError) {
            console.error("Error fetching entrepreneur ID:", entrepreneurError);
            return;
          }
          
          if (entrepreneurData) {
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
              return;
            }
            
            console.log("Fetched projects:", projectData);
          }
        }
        
        // Fetch documents for the user's projects
        // This will be implemented in the project context
        
        // Fetch messages for the user
        // This will be implemented in the message context
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  // Filter projects based on user role
  const userProjects = projects.filter((project) => 
    user?.role === "entrepreneur" 
      ? project.ownerId === user.id 
      : project.assigneeId === user.id
  );

  // Get open project proposals (for students)
  const projectProposals = projects.filter(
    (project) => project.status === "open" && !project.assigneeId
  );

  // Get unread messages
  const unreadMessages = messages.filter(
    (message) => message.recipient === user?.id && !message.read
  );

  // Calculate project statistics
  const totalProjects = userProjects.length;
  const completedProjects = userProjects.filter(
    (project) => project.status === "completed"
  ).length;

  // Calculate earnings (for students)
  const totalEarnings = userProjects
    .filter((project) => project.status === "completed")
    .reduce((sum, project) => sum + (project.price || 0), 0);

  // Get recent documents
  const recentDocuments = userProjects
    .flatMap((project) => project.documents)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3);

  // Mock some reviews for display
  const mockReviews = [
    {
      id: "1",
      projectId: "1",
      reviewerId: "1",
      studentId: "2",
      rating: 5,
      comment: "Excellent work! Delivered ahead of schedule.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      projectId: "2",
      reviewerId: "1",
      studentId: "2",
      rating: 4,
      comment: "Great design skills, would hire again.",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  ];

  // Mock online users
  const onlineUsers = [
    { id: "1", name: "John Entrepreneur", isOnline: true },
    { id: "3", name: "Alice Designer", isOnline: false },
  ];

  return (
    <AppLayout>
      {loading ? (
        <div className="flex justify-center items-center h-80">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tiro-purple"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
            {user?.role === "entrepreneur" && (
              <Button
                onClick={() => navigate("/projects/new")}
                className="bg-tiro-purple hover:bg-tiro-purple/90"
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
                  {user?.role === "entrepreneur" ? totalProjects : projectProposals.length}
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
                      {totalEarnings}
                    </>
                  ) : (
                    <>
                      <MessageSquare className="inline mr-1 h-6 w-6 text-blue-600" />
                      {unreadMessages.length}
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
                  {projectProposals.length > 0 ? (
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
                          {projectProposals.slice(0, 3).map((project) => (
                            <TableRow key={project.id}>
                              <TableCell className="font-medium">{project.title}</TableCell>
                              <TableCell>
                                {project.description.substring(0, 50)}
                                {project.description.length > 50 && "..."}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <Link to={`/projects/${project.id}`}>View Details</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {projectProposals.length > 3 && (
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
                  {mockReviews.length > 0 ? (
                    <div className="space-y-4">
                      {mockReviews.map((review) => (
                        <div
                          key={review.id}
                          className="border-b pb-4 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating 
                                    ? "text-yellow-400 fill-yellow-400" 
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No reviews yet.</p>
                  )}
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
                {userProjects.length > 0 ? (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userProjects.slice(0, 5).map((project) => (
                          <TableRow key={project.id}>
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
                              {project.assigneeId ? "Assigned" : "Unassigned"}
                            </TableCell>
                            <TableCell>
                              {project.tasks.length > 0
                                ? `${
                                    Math.round(
                                      (project.tasks.filter(
                                        (task) => task.status === "done"
                                      ).length /
                                      project.tasks.length) *
                                      100
                                    )
                                  }%`
                                : "No tasks"}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/projects/${project.id}`}>View</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {userProjects.length > 5 && (
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
            {/* Recent Messages with online status */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
                <CardDescription>Your conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {unreadMessages.length > 0 || onlineUsers.length > 0 ? (
                  <div className="space-y-4">
                    {onlineUsers.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center">
                          <div className="relative mr-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User size={20} />
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
                                contact.isOnline ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-xs text-gray-500">
                              {contact.isOnline ? "Online" : "Offline"}
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
                {recentDocuments.length > 0 ? (
                  <div className="space-y-4">
                    {recentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center">
                          <div className="mr-3 p-2 bg-gray-100 rounded">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No documents available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
