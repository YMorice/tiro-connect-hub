
import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import DocumentUpload from "@/components/DocumentUpload";
import ProjectReviewSection from "@/components/reviews/ProjectReviewSection";

interface Project {
  id_project: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  price: number;
  id_entrepreneur: string;
  selected_student?: string;
  entrepreneur?: {
    users: {
      name: string;
      email: string;
      pp_link?: string;
    };
  };
  student?: {
    users: {
      name: string;
      email: string;
      pp_link?: string;
    };
  };
}

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    if (user && id) {
      fetchProject();
      setUserRole((user as any).role || "");
    }
  }, [user, id]);

  const fetchProject = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          entrepreneurs!inner (
            users!inner (name, email, pp_link)
          ),
          students (
            users!inner (name, email, pp_link)
          )
        `)
        .eq("id_project", id)
        .single();

      if (error) throw error;

      const projectData = {
        ...data,
        entrepreneur: data.entrepreneurs,
        student: data.students
      };

      setProject(projectData);
    } catch (error: any) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiro-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-red-600">Project not found</h1>
        </div>
      </AppLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "open": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {project.title}
              </h1>
              <Badge className={getStatusColor(project.status)}>
                {project.status?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            {project.price && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Project Value</p>
                <p className="text-2xl font-bold text-tiro-primary">
                  €{project.price.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            <p className="text-gray-700 leading-relaxed">
              {project.description || "No description provided."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Entrepreneur</h3>
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  {project.entrepreneur?.users?.pp_link ? (
                    <AvatarImage 
                      src={`${project.entrepreneur.users.pp_link}?t=${Date.now()}`}
                      alt={project.entrepreneur.users.name}
                    />
                  ) : (
                    <AvatarFallback className="bg-tiro-primary text-white">
                      {project.entrepreneur?.users?.name?.charAt(0) || "E"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">{project.entrepreneur?.users?.name}</p>
                  <p className="text-sm text-gray-500">{project.entrepreneur?.users?.email}</p>
                </div>
              </div>
            </div>

            {project.student && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Assigned Student</h3>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    {project.student?.users?.pp_link ? (
                      <AvatarImage 
                        src={`${project.student.users.pp_link}?t=${Date.now()}`}
                        alt={project.student.users.name}
                      />
                    ) : (
                      <AvatarFallback className="bg-tiro-primary text-white">
                        {project.student?.users?.name?.charAt(0) || "S"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{project.student?.users?.name}</p>
                    <p className="text-sm text-gray-500">{project.student?.users?.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Project Documents</h3>
            <DocumentUpload projectId={project.id_project} />
          </div>

          {project.student && project.selected_student && (
            <ProjectReviewSection
              projectId={project.id_project}
              studentId={project.selected_student}
              projectStatus={project.status}
            />
          )}

          <div className="mt-6 text-sm text-gray-500">
            <p>Created on: {new Date(project.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProjectDetail;
