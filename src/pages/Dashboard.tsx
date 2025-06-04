import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  FolderPlus, 
  MessageCircle, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const { projects, loading, loadProjects } = useProjects();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  // Calculate dashboard metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === "Active" || p.status === "In progress").length;
  const completedProjects = projects.filter(p => p.status === "completed").length;
  const pendingProjects = projects.filter(p => p.status === "New" || p.status === "Proposals").length;

  // Get recent projects (last 5)
  const recentProjects = projects
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed": return "bg-green-100 text-green-800";
      case "active": case "in progress": return "bg-blue-100 text-blue-800";
      case "new": case "proposals": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.user_metadata?.name || "User"}!
            </h1>
            <p className="text-gray-600">
              Here's an overview of your projects and recent activity.
            </p>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Projects
                </CardTitle>
                <FolderPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  All your projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active Projects
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{activeProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Currently in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Completed
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{completedProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully finished
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pending
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting action
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Recent Projects</CardTitle>
                      <CardDescription>
                        Your latest project activity
                      </CardDescription>
                    </div>
                    <Link to="/projects">
                      <Button variant="outline" size="sm">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentProjects.length > 0 ? (
                    recentProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`/projects/${project.id}`}
                            className="font-medium text-gray-900 hover:text-tiro-primary transition-colors truncate block"
                          >
                            {project.title}
                          </Link>
                          <div className="flex items-center mt-1 space-x-2">
                            <Badge className={`${getStatusColor(project.status)} text-xs`}>
                              {project.status}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(project.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Link to={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FolderPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No projects yet</p>
                      <Link to="/projects/pack-selection">
                        <Button className="bg-tiro-purple hover:bg-tiro-purple/90">
                          Create Your First Project
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks and shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/projects/pack-selection" className="block">
                    <Button className="w-full justify-start bg-tiro-purple hover:bg-tiro-purple/90">
                      <FolderPlus className="mr-2 h-4 w-4" />
                      New Project
                    </Button>
                  </Link>
                  <Link to="/projects" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      View All Projects
                    </Button>
                  </Link>
                  <Link to="/messages" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Messages
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tips & Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-tiro-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Stay Connected
                      </p>
                      <p className="text-xs text-gray-600">
                        Regular communication with your student leads to better project outcomes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Clear Requirements
                      </p>
                      <p className="text-xs text-gray-600">
                        Detailed project descriptions help students deliver exactly what you need.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
