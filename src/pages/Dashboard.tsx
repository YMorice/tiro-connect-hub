
import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Users, Briefcase, MessageSquare, Star, PlusCircle, Eye } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    projects: 0,
    messages: 0,
    reviews: 0,
    students: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        if ((user as any).role === 'entrepreneur') {
          // Single query to get entrepreneur data and related stats
          const { data: entrepreneurData, error } = await supabase
            .from('entrepreneurs')
            .select(`
              id_entrepreneur,
              projects (
                id_project,
                title,
                description,
                status,
                created_at
              )
            `)
            .eq('id_user', user.id)
            .single();
            
          if (error) {
            console.error('Error fetching entrepreneur data:', error);
            return;
          }
          
          const projects = entrepreneurData?.projects || [];
          
          // Get additional stats in parallel
          const [messagesResult, reviewsResult] = await Promise.all([
            supabase
              .from('messages')
              .select('id_message', { count: 'exact' })
              .in('project_id', projects.map(p => p.id_project)),
            supabase
              .from('reviews')
              .select('id', { count: 'exact' })
              .eq('entrepreneur_id', entrepreneurData.id_entrepreneur)
          ]);
          
          setStats({
            projects: projects.length,
            messages: messagesResult.count || 0,
            reviews: reviewsResult.count || 0,
            students: 0,
          });
          
          // Set recent projects (limit to 5 most recent)
          const sortedProjects = projects
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
          setRecentProjects(sortedProjects);
          
        } else if ((user as any).role === 'student') {
          // Get student data and assigned projects
          const { data: studentData, error } = await supabase
            .from('students')
            .select(`
              id_student,
              project_assignments (
                projects (
                  id_project,
                  title,
                  description,
                  status,
                  created_at
                )
              )
            `)
            .eq('id_user', user.id)
            .single();
            
          if (error) {
            console.error('Error fetching student data:', error);
            return;
          }
          
          const projects = studentData?.project_assignments?.map(pa => pa.projects).filter(Boolean) || [];
          
          // Get additional stats in parallel
          const [messagesResult, reviewsResult] = await Promise.all([
            supabase
              .from('messages')
              .select('id_message', { count: 'exact' })
              .in('project_id', projects.map(p => p.id_project)),
            supabase
              .from('reviews')
              .select('id', { count: 'exact' })
              .eq('student_id', studentData.id_student)
          ]);
          
          setStats({
            projects: projects.length,
            messages: messagesResult.count || 0,
            reviews: reviewsResult.count || 0,
            students: 0,
          });
          
          setRecentProjects(projects.slice(0, 5));
          
        } else if ((user as any).role === 'admin') {
          // Get all stats for admin in parallel
          const [projectsResult, messagesResult, reviewsResult, studentsResult] = await Promise.all([
            supabase.from('projects').select('id_project', { count: 'exact' }),
            supabase.from('messages').select('id_message', { count: 'exact' }),
            supabase.from('reviews').select('id', { count: 'exact' }),
            supabase.from('students').select('id_student', { count: 'exact' })
          ]);
          
          setStats({
            projects: projectsResult.count || 0,
            messages: messagesResult.count || 0,
            reviews: reviewsResult.count || 0,
            students: studentsResult.count || 0,
          });
          
          // Get recent projects for admin
          const { data: recentProjectsData } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
            
          setRecentProjects(recentProjectsData || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, (user as any)?.role]);

  const dashboardCards = useMemo(() => {
    const baseCards = [
      {
        title: "Projects",
        value: stats.projects,
        icon: Briefcase,
        description: "Active projects",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        title: "Messages",
        value: stats.messages,
        icon: MessageSquare,
        description: "Unread messages",
        color: "text-green-600",
        bgColor: "bg-green-50",
      },
      {
        title: "Reviews",
        value: stats.reviews,
        icon: Star,
        description: "Total reviews",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
      },
    ];

    if ((user as any)?.role === 'admin') {
      baseCards.push({
        title: "Students",
        value: stats.students,
        icon: Users,
        description: "Registered students",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      });
    }

    return baseCards;
  }, [stats, (user as any)?.role]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tiro-purple"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome back, {(user as any)?.name || user?.email}!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Here's what's happening with your projects today.
          </p>
        </div>

        {/* Stats Grid - Improved responsive layout */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {dashboardCards.map((card) => (
            <Card key={card.title} className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor} flex-shrink-0`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Projects - Improved mobile layout */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg sm:text-xl">Recent Projects</CardTitle>
                <CardDescription className="text-sm">
                  Your most recent project activity
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {(user as any)?.role === "entrepreneur" && (
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link to="/projects/pack-selection">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      New Project
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link to="/projects">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div
                    key={project.id_project}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg space-y-3 sm:space-y-0"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{project.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                        {project.description?.substring(0, 100)}...
                      </p>
                      <div className="flex items-center mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            project.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : project.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : project.status === "open"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {project.status?.replace("_", " ").toUpperCase() || "DRAFT"}
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto sm:ml-4">
                      <Link to={`/projects/${project.id_project}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No projects yet</p>
                {(user as any)?.role === "entrepreneur" && (
                  <Button asChild className="mt-4">
                    <Link to="/projects/pack-selection">
                      Create Your First Project
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
