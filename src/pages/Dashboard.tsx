import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  FolderOpen, 
  Users, 
  MessageSquare, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalMessages: number;
  unreadMessages: number;
  totalStudents?: number;
  totalEntrepreneurs?: number;
  pendingProposals?: number;
}

interface Project {
  id: string;
  title: string;
  status: string;
  created_at: string;
  proposalStatus?: 'pending' | 'accepted' | 'declined';
}

// Helper function to convert database status to display status
const convertDbStatusToDisplay = (dbStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    'STEP1': 'New',
    'STEP2': 'Proposals', 
    'STEP3': 'Selection',
    'STEP4': 'Payment',
    'STEP5': 'Active',
    'STEP6': 'Completed'
  };
  return statusMap[dbStatus] || dbStatus;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalMessages: 0,
    unreadMessages: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const userRole = (user as any).role;
      
      if (userRole === "entrepreneur") {
        // Get entrepreneur data and their projects only
        const { data: entrepreneurData, error: entrepreneurError } = await supabase
          .from('entrepreneurs')
          .select(`
            id_entrepreneur,
            projects (
              id_project,
              title,
              status,
              created_at
            )
          `)
          .eq('id_user', user.id)
          .single();
          
        if (entrepreneurError) {
          console.error('Error fetching entrepreneur data:', entrepreneurError);
          return;
        }
        
        const projects = entrepreneurData?.projects || [];
        const totalProjects = projects.length;
        
        // Convert statuses and count
        const convertedProjects = projects.map(p => ({
          ...p,
          status: convertDbStatusToDisplay(p.status || 'STEP1')
        }));
        
        const activeProjects = convertedProjects.filter(p => 
          ['Active', 'In progress'].includes(p.status)
        ).length;
        
        const completedProjects = convertedProjects.filter(p => 
          p.status === 'completed'
        ).length;

        // Get messages count for entrepreneur
        const { count: totalMessages } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', user.id);

        const { count: unreadMessages } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .neq('sender_id', user.id)
          .eq('read', false);

        setStats({
          totalProjects,
          activeProjects,
          completedProjects,
          totalMessages: totalMessages || 0,
          unreadMessages: unreadMessages || 0,
        });

        setRecentProjects(convertedProjects.slice(0, 5).map(p => ({
          id: p.id_project,
          title: p.title,
          status: p.status,
          created_at: p.created_at
        })));
        
      } else if (userRole === "student") {
        // Get student data and projects proposed to them
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
          // Get only projects that were proposed to this student
          const { data: proposalData, error: proposalError } = await supabase
            .from('proposal_to_student')
            .select(`
              id_proposal,
              accepted,
              projects (
                id_project,
                title,
                status,
                created_at
              )
            `)
            .eq('id_student', studentData.id_student);
          
          if (proposalError) {
            console.error('Error fetching proposals:', proposalError);
            return;
          }
          
          const proposalProjects = proposalData?.map(p => ({
            ...p.projects,
            proposalStatus: p.accepted === null ? 'pending' as const : (p.accepted ? 'accepted' as const : 'declined' as const)
          })).filter(Boolean) || [];
          
          const totalProjects = proposalProjects.length;
          
          // Convert statuses and count
          const convertedProjects = proposalProjects.map(p => ({
            ...p,
            status: convertDbStatusToDisplay(p.status || 'STEP1')
          }));
          
          const activeProjects = convertedProjects.filter(p => 
            ['Active', 'In progress'].includes(p.status) && p.proposalStatus === 'accepted'
          ).length;
          
          const completedProjects = convertedProjects.filter(p => 
            p.status === 'completed' && p.proposalStatus === 'accepted'
          ).length;
          
          const pendingProposals = proposalProjects.filter(p => 
            p.proposalStatus === 'pending'
          ).length;

          // Get messages count for student
          const { count: totalMessages } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', user.id);

          const { count: unreadMessages } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .neq('sender_id', user.id)
            .eq('read', false);

          setStats({
            totalProjects,
            activeProjects,
            completedProjects,
            totalMessages: totalMessages || 0,
            unreadMessages: unreadMessages || 0,
            pendingProposals,
          });

          setRecentProjects(convertedProjects.slice(0, 5).map(p => ({
            id: p.id_project,
            title: p.title,
            status: p.status,
            created_at: p.created_at,
            proposalStatus: p.proposalStatus
          })));
        }
        
      } else if (userRole === "admin") {
        // Admin sees all data
        const [projectsResult, studentsResult, entrepreneursResult] = await Promise.all([
          supabase
            .from('projects')
            .select('id_project, title, status, created_at'),
          supabase
            .from('students')
            .select('id_student', { count: 'exact', head: true }),
          supabase
            .from('entrepreneurs')
            .select('id_entrepreneur', { count: 'exact', head: true })
        ]);
        
        const projects = projectsResult.data || [];
        const totalProjects = projects.length;
        
        // Convert statuses and count
        const convertedProjects = projects.map(p => ({
          ...p,
          status: convertDbStatusToDisplay(p.status || 'STEP1')
        }));
        
        const activeProjects = convertedProjects.filter(p => 
          ['Active', 'In progress'].includes(p.status)
        ).length;
        
        const completedProjects = convertedProjects.filter(p => 
          p.status === 'completed'
        ).length;

        // Get messages count
        const { count: totalMessages } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true });

        const { count: unreadMessages } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('read', false);

        setStats({
          totalProjects,
          activeProjects,
          completedProjects,
          totalMessages: totalMessages || 0,
          unreadMessages: unreadMessages || 0,
          totalStudents: studentsResult.count || 0,
          totalEntrepreneurs: entrepreneursResult.count || 0,
        });

        setRecentProjects(convertedProjects.slice(0, 5).map(p => ({
          id: p.id_project,
          title: p.title,
          status: p.status,
          created_at: p.created_at
        })));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id, (user as any)?.role]);

  const chartData = useMemo(() => {
    const data = [
      { name: 'New', value: stats.totalProjects - stats.activeProjects - stats.completedProjects },
      { name: 'Active', value: stats.activeProjects },
      { name: 'Completed', value: stats.completedProjects },
    ];
    return data.filter(item => item.value > 0);
  }, [stats]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-gray-100 text-gray-800';
      case 'Active':
        return 'bg-blue-100 text-blue-800';
      case 'In progress':
        return 'bg-green-100 text-green-800';
      case 'Proposals':
        return 'bg-yellow-100 text-yellow-800';
      case 'Selection':
      case 'Payment':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const userRole = (user as any)?.role;

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name}! Here's what's happening with your projects.
            </p>
          </div>
          {userRole === "entrepreneur" && (
            <Button asChild className="bg-tiro-primary hover:bg-tiro-primary/90">
              <Link to="/new-project">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {userRole === "student" && stats.pendingProposals 
                  ? `${stats.pendingProposals} pending proposals`
                  : userRole === "student" 
                  ? "Projects proposed to you"
                  : "All your projects"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">Currently in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unreadMessages} unread
              </p>
            </CardContent>
          </Card>

          {userRole === "admin" ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats.totalStudents || 0) + (stats.totalEntrepreneurs || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalStudents} students, {stats.totalEntrepreneurs} entrepreneurs
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedProjects}</div>
                <p className="text-xs text-muted-foreground">Successfully completed</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts and Recent Projects */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Project Status Chart */}
          {stats.totalProjects > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Projects</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/projects">
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentProjects.length > 0 ? (
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{project.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {project.proposalStatus && (
                          <Badge variant={project.proposalStatus === 'pending' ? 'default' : 'secondary'}>
                            {project.proposalStatus}
                          </Badge>
                        )}
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {userRole === "student" 
                      ? "You'll see projects here when you receive proposals"
                      : "No projects yet. Create your first project to get started!"}
                  </p>
                  {userRole === "entrepreneur" && (
                    <Button className="mt-4" asChild>
                      <Link to="/new-project">Create Project</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
