
import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentUpload from "@/components/DocumentUpload";
import ProjectReviewSection from "@/components/reviews/ProjectReviewSection";
import { Download, FileText, Calendar, User, DollarSign } from "lucide-react";

interface ProjectDocument {
  id_document: string;
  name: string;
  link: string;
  type: string;
  created_at: string;
}

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
  documents?: ProjectDocument[];
}

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchProject();
    }
  }, [user, id]);

  const fetchProject = async () => {
    if (!id) return;

    try {
      setLoading(true);
      console.log("Fetching project with ID:", id);

      // Fetch project with entrepreneur data
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select(`
          *,
          entrepreneurs (
            users (name, email, pp_link)
          )
        `)
        .eq("id_project", id)
        .single();

      if (projectError) {
        console.error("Project fetch error:", projectError);
        throw projectError;
      }

      console.log("Project data fetched:", projectData);

      let studentData = null;
      
      // If there's a selected student, fetch their data
      if (projectData.selected_student) {
        console.log("Fetching student data for:", projectData.selected_student);
        const { data: studentInfo, error: studentError } = await supabase
          .from("students")
          .select(`
            users (name, email, pp_link)
          `)
          .eq("id_student", projectData.selected_student)
          .single();

        if (!studentError && studentInfo) {
          studentData = studentInfo;
          console.log("Student data fetched:", studentData);
        } else {
          console.error("Student fetch error:", studentError);
        }
      }

      // Fetch project documents
      await fetchProjectDocuments(id, projectData, studentData);

    } catch (error: any) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project details");
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDocuments = async (projectId: string, projectData: any, studentData: any) => {
    try {
      setDocumentsLoading(true);
      console.log("Fetching documents for project:", projectId);

      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .eq("id_project", projectId)
        .order("created_at", { ascending: false });

      if (documentsError) {
        console.error("Documents fetch error:", documentsError);
        throw documentsError;
      }

      console.log("Documents fetched:", documentsData?.length || 0);

      const formattedProject = {
        ...projectData,
        entrepreneur: projectData.entrepreneurs,
        student: studentData,
        documents: documentsData || []
      };

      setProject(formattedProject);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      // Don't show error for documents, just set empty array
      const formattedProject = {
        ...projectData,
        entrepreneur: projectData.entrepreneurs,
        student: studentData,
        documents: []
      };
      setProject(formattedProject);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentSubmit = async (documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => {
    console.log("Document uploaded:", documentDetails);
    toast.success(`Document "${documentDetails.documentName}" uploaded successfully`);
    
    // Refresh project data to show new document
    if (id) {
      const currentProject = project;
      if (currentProject) {
        await fetchProjectDocuments(id, currentProject, currentProject.student);
      }
    }
  };

  const downloadDocument = (doc: ProjectDocument) => {
    window.open(doc.link, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "open": return "bg-yellow-100 text-yellow-800";
      case "step5": return "bg-green-100 text-green-800";
      case "step6": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'STEP1': 'New',
      'STEP2': 'Proposals',
      'STEP3': 'Selection',
      'STEP4': 'Payment',
      'STEP5': 'Active',
      'STEP6': 'In Progress'
    };
    return statusMap[status] || status?.replace('_', ' ').toUpperCase() || 'Unknown';
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Project not found</h1>
            <p className="text-gray-600">The project you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3 break-words">
                    {project.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`${getStatusColor(project.status)} text-sm`}>
                      {getStatusDisplay(project.status)}
                    </Badge>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {project.price && (
                  <div className="flex items-center bg-gray-50 px-4 py-3 rounded-lg">
                    <DollarSign className="h-5 w-5 text-tiro-primary mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Project Value</p>
                      <p className="text-xl font-bold text-tiro-primary">
                        €{project.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Description Card */}
          {project.description && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* People Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Entrepreneur Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Entrepreneur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    {project.entrepreneur?.users?.pp_link ? (
                      <AvatarImage 
                        src={project.entrepreneur.users.pp_link}
                        alt={project.entrepreneur.users.name}
                      />
                    ) : (
                      <AvatarFallback className="bg-tiro-primary text-white">
                        {project.entrepreneur?.users?.name?.charAt(0) || "E"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">{project.entrepreneur?.users?.name}</p>
                    <p className="text-sm text-gray-500">{project.entrepreneur?.users?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Card */}
            {project.student && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Assigned Student
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      {project.student?.users?.pp_link ? (
                        <AvatarImage 
                          src={project.student.users.pp_link}
                          alt={project.student.users.name}
                        />
                      ) : (
                        <AvatarFallback className="bg-tiro-primary text-white">
                          {project.student?.users?.name?.charAt(0) || "S"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{project.student?.users?.name}</p>
                      <p className="text-sm text-gray-500">{project.student?.users?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Documents Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Project Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document Upload */}
              <DocumentUpload 
                projectId={project.id_project} 
                onDocumentSubmit={handleDocumentSubmit}
              />

              {/* Documents List */}
              {documentsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tiro-primary"></div>
                </div>
              ) : project.documents && project.documents.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
                  <div className="grid gap-3">
                    {project.documents.map((doc) => (
                      <div 
                        key={doc.id_document}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-sm text-gray-500">
                              {doc.type} • {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument(doc)}
                          className="flex-shrink-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No documents uploaded yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Review Section */}
          {project.student && project.selected_student && (
            <Card>
              <CardContent className="p-0">
                <ProjectReviewSection
                  projectId={project.id_project}
                  studentId={project.selected_student}
                  projectStatus={project.status}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProjectDetail;
