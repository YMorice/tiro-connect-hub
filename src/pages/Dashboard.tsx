
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import { useMessages } from "@/context/message-context";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const Dashboard = () => {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { messages } = useMessages();
  const navigate = useNavigate();

  // Filter projects based on user role
  const userProjects = projects.filter((project) => 
    user?.role === "entrepreneur" 
      ? project.ownerId === user.id 
      : project.assigneeId === user.id
  );

  // Get unread messages
  const unreadMessages = messages.filter(
    (message) => message.recipient === user?.id && !message.read
  );

  // Calculate project statistics
  const totalProjects = userProjects.length;
  const inProgressProjects = userProjects.filter(
    (project) => project.status === "in_progress"
  ).length;
  const completedProjects = userProjects.filter(
    (project) => project.status === "completed"
  ).length;

  return (
    <AppLayout>
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
                Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inProgressProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unread Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{unreadMessages.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your most recent projects</CardDescription>
          </CardHeader>
          <CardContent>
            {userProjects.length > 0 ? (
              <div className="space-y-4">
                {userProjects.slice(0, 3).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div>
                      <h3 className="font-medium">{project.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.description.substring(0, 50)}
                        {project.description.length > 50 && "..."}
                      </p>
                      <div className="flex items-center mt-1">
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
                          {project.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/projects/${project.id}`}>View Details</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No projects found.</p>
            )}
            {userProjects.length > 0 && (
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link to="/projects">View All Projects</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Your recent conversations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {unreadMessages.length > 0 ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    You have {unreadMessages.length} unread message(s)
                  </p>
                  <Button asChild>
                    <Link to="/messages">View Messages</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No unread messages.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your account details</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/profile">Update Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
