import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

interface Project {
  id_project: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  entrepreneurs: {
    users: {
      name: string;
      surname: string;
    };
  } | null;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && (user as any).role !== "admin") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id_project,
            title,
            description,
            status,
            created_at,
            entrepreneurs (
              users (
                name,
                surname
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setProjects(data || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user && (user as any).role === "admin") {
      fetchProjects();
    }
  }, [user]);

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'STEP1': 'New',
      'STEP2': 'Proposals',
      'STEP3': 'Selection',
      'STEP4': 'Payment',
      'STEP5': 'Active',
      'STEP6': 'In progress'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'STEP1': 'bg-blue-100 text-blue-800',
      'STEP2': 'bg-purple-100 text-purple-800',
      'STEP3': 'bg-green-100 text-green-800',
      'STEP4': 'bg-yellow-100 text-yellow-800',
      'STEP5': 'bg-green-100 text-green-800',
      'STEP6': 'bg-gray-100 text-gray-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getActionButton = (project: any) => {
    const baseParams = `projectId=${project.id_project}&projectTitle=${encodeURIComponent(project.title)}`;
    
    switch (project.status) {
      case 'STEP1': // New
        return (
          <Button
            size="sm"
            onClick={() => navigate(`/student-selection?${baseParams}`)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Select Students
          </Button>
        );
      case 'STEP2': // Proposals
        return (
          <Button
            size="sm"
            onClick={() => navigate(`/proposal-student-selection?${baseParams}`)}
            className="bg-green-600 hover:bg-green-700"
          >
            Select from Accepted
          </Button>
        );
      case 'STEP3': // Selection
        return (
          <Button
            size="sm"
            onClick={() => navigate(`/accepted-students?${baseParams}`)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            View Proposed Students
          </Button>
        );
      case 'STEP4': // Payment
      case 'STEP5': // Active
      case 'STEP6': // In progress
        return (
          <Button
            size="sm"
            onClick={() => navigate(`/messages?projectId=${project.id_project}`)}
            className="bg-gray-600 hover:bg-gray-700"
          >
            View Conversation
          </Button>
        );
      default:
        return null;
    }
  };

  if (!user || (user as any).role !== "admin") {
    return null;
  }

  const totalProjects = projects.length;
  const newProjects = projects.filter(project => project.status === 'STEP1').length;
  const activeProjects = projects.filter(project => project.status === 'STEP5').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={() => navigate('/new-project')}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>New Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjects}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Entrepreneur</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length > 0 ? (
                      projects.map((project) => (
                        <TableRow key={project.id_project}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{project.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {project.description ? 
                                  (project.description.length > 50 ? 
                                    `${project.description.substring(0, 50)}...` : 
                                    project.description
                                  ) : 
                                  'No description'
                                }
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {project.entrepreneurs?.users ? 
                              `${project.entrepreneurs.users.name} ${project.entrepreneurs.users.surname}` : 
                              'Unknown'
                            }
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                              {getStatusDisplay(project.status)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(project.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {getActionButton(project)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No projects found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Admin;
