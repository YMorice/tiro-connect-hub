/**
 * Project Detail Page Component
 * 
 * This component displays comprehensive information about a specific project including:
 * - Project metadata (title, description, status, price)
 * - Entrepreneur and student information with avatars
 * - Project documents with upload functionality
 * - Review system for completed projects
 * 
 * The component handles different user roles and project states appropriately,
 * ensuring proper access control and functionality based on context.
 * 
 * Key Features:
 * - Responsive design for all screen sizes
 * - Real-time document management
 * - Avatar display with fallback handling
 * - Status-based conditional rendering
 * - Review submission for entrepreneurs
 */

import React, { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
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
import StudentProposalActions from "@/components/student/StudentProposalActions";
import StudentSelectionView from "@/components/student-selection/StudentSelectionView";
import { ProposedStudentsDisplay } from "@/components/student-selection/ProposedStudentsDisplay";
import { Download, FileText, Calendar, User, DollarSign, MessageCircle, Users } from "lucide-react";

/**
 * Interface for project document data structure
 * Represents a document associated with a project
 */
interface ProjectDocument {
  /** Unique identifier for the document */
  id_document: string;
  /** Display name of the document */
  name: string;
  /** URL or path to access the document */
  link: string;
  /** Type of document (proposal, final, regular, etc.) */
  type: string;
  /** Timestamp when the document was uploaded */
  created_at: string;
}

/**
 * Interface for project data structure with related entities
 * Contains all project information and related user data
 */
interface Project {
  /** Unique identifier for the project */
  id_project: string;
  /** Project title/name */
  title: string;
  /** Detailed description of the project */
  description: string;
  /** Current status of the project (STEP1-STEP6, completed, etc.) */
  status: string;
  /** Timestamp when the project was created */
  created_at: string;
  /** Project budget/price in euros */
  price: number;
  /** ID of the entrepreneur who owns the project */
  id_entrepreneur: string;
  /** ID of the selected student (if any) */
  selected_student?: string;
  /** Entrepreneur information with nested user data */
  entrepreneur?: {
    users: {
      name: string;
      email: string;
      pp_link?: string;
    };
  };
  /** Student information with nested user data */
  student?: {
    users: {
      name: string;
      email: string;
      pp_link?: string;
    };
  };
  /** Array of documents associated with the project */
  documents?: ProjectDocument[];
}

/**
 * ProjectDetail Component
 * Main component that renders the project detail page
 */
const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  
  // Check if the ID is a valid UUID format, if not redirect to appropriate page
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
  
  if (!isValidUUID) {
    // Handle special routes that aren't project IDs
    if (id === 'pack-selection') {
      return <Navigate to="/projects/pack-selection" replace />;
    }
    // For any other invalid UUID, redirect to projects page
    return <Navigate to="/projects" replace />;
  }
  
  // State management
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [proposalStatus, setProposalStatus] = useState<'pending' | 'accepted' | 'declined' | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [entrepreneurId, setEntrepreneurId] = useState<string | null>(null);

  // Fetch project data when component mounts or dependencies change
  useEffect(() => {
    if (user && id && isValidUUID) {
      fetchProject();
      checkUnreadMessages();
      if ((user as any)?.role === 'student') {
        checkProposalStatus();
      }
      if ((user as any)?.role === 'entrepreneur') {
        fetchEntrepreneurId();
      }
    }
  }, [user, id, isValidUUID]);

  /**
   * Fetches entrepreneur ID for the current user
   */
  const fetchEntrepreneurId = async () => {
    if (!user) return;
    
    try {
      const { data: entrepreneurData } = await supabase
        .from('entrepreneurs')
        .select('id_entrepreneur')
        .eq('id_user', user.id)
        .single();

      if (entrepreneurData) {
        setEntrepreneurId(entrepreneurData.id_entrepreneur);
      }
    } catch (error) {
      console.error('Error fetching entrepreneur ID:', error);
    }
  };

  /**
   * Handles proposal status changes and refetches proposal status
   */
  const handleProposalStatusChange = () => {
    checkProposalStatus();
  };

  /**
   * Handles when a student is selected by the entrepreneur
   * Refreshes the project data to reflect the changes
   */
  const handleStudentSelected = () => {
    fetchProject();
  };

  /**
   * Fetches comprehensive project data including related entities
   * 
   * This function:
   * 1. Fetches the main project data with entrepreneur information
   * 2. If there's a selected student, fetches their information
   * 3. Fetches all project documents
   * 4. Combines all data into a single project object
   */
  const fetchProject = async () => {
    if (!id) return;

    try {
      setLoading(true);
      console.log("Fetching project with ID:", id);

      // Fetch main project data with entrepreneur information
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
      
      // Fetch selected student data if available
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

      // Fetch project documents and combine all data
      await fetchProjectDocuments(id, projectData, studentData);

    } catch (error: any) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project details");
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches all documents associated with the project
   * 
   * @param projectId - The ID of the project to fetch documents for
   * @param projectData - The main project data object
   * @param studentData - The student data object (if available)
   */
  const fetchProjectDocuments = async (projectId: string, projectData: any, studentData: any) => {
    try {
      setDocumentsLoading(true);
      console.log("Fetching documents for project:", projectId);

      // Fetch all documents for this project, ordered by creation date (newest first)
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

      // Combine all data into final project object
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

  /**
   * Handles successful document upload
   * Refreshes the project documents list to show the new document
   * 
   * @param documentDetails - Object containing details of the uploaded document
   */
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

  /**
   * Downloads a document by opening it in a new tab
   * 
   * @param doc - The document object to download
   */
  const downloadDocument = (doc: ProjectDocument) => {
    window.open(doc.link, '_blank');
  };

  /**
   * Returns appropriate CSS classes for status badges based on project status
   * 
   * @param status - The project status string
   * @returns CSS classes for styling the status badge
   */
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

  /**
   * Converts internal status codes to user-friendly display names
   * 
   * @param status - The internal status code
   * @returns Human-readable status string
   */
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

  // Checks if there are unread messages in this project's conversation
  const checkUnreadMessages = async () => {
    if (!user?.id || !id) return;

    try {
      // Get the message group for this project that includes the current user
      const { data: userGroup, error: groupError } = await supabase
        .from('message_groups')
        .select('id_group')
        .eq('id_project', id)
        .eq('id_user', user.id)
        .maybeSingle();

      if (groupError || !userGroup) return;

      // Check for unread messages in this group (not sent by current user)
      const { count: unreadCount, error: unreadError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', userGroup.id_group)
        .eq('read', false)
        .neq('sender_id', user.id);

      if (!unreadError && unreadCount && unreadCount > 0) {
        setHasUnreadMessages(true);
      }
    } catch (error) {
      console.error("Error checking unread messages:", error);
    }
  };

  // Checks the proposal status for students
  const checkProposalStatus = async () => {
    if (!user?.id || !id) return;

    try {
      // Get student ID
      const { data: studentData } = await supabase
        .from('students')
        .select('id_student')
        .eq('id_user', user.id)
        .single();

      if (studentData) {
        setStudentId(studentData.id_student);
        
        // Check proposal status
        const { data: proposalData } = await supabase
          .from('proposal_to_student')
          .select('accepted')
          .eq('id_project', id)
          .eq('id_student', studentData.id_student)
          .single();

        if (proposalData) {
          if (proposalData.accepted === null) {
            setProposalStatus('pending');
          } else if (proposalData.accepted === true) {
            setProposalStatus('accepted');
          } else {
            setProposalStatus('declined');
          }
        }
      }
    } catch (error) {
      console.error('Error checking proposal status:', error);
    }
  };

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-primary"></div>
        </div>
      </AppLayout>
    );
  }

  // Show error state if project not found
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

  const userRole = (user as any)?.role;
  const isEntrepreneur = userRole === 'entrepreneur';
  const isStudent = userRole === 'student';

  // Check if this is the entrepreneur's project and if student selection is needed
  const showStudentSelection = isEntrepreneur && 
    entrepreneurId && 
    project?.id_entrepreneur === entrepreneurId && 
    !project?.selected_student && 
    (project?.status === 'STEP2' || project?.status === 'STEP3');

  // Check if we should show proposed students (for Selection status)
  const showProposedStudents = isEntrepreneur && 
    entrepreneurId &&
    project?.id_entrepreneur === entrepreneurId && 
    project?.status === 'STEP3' && // Selection status
    !project?.selected_student;

  console.log("Debug info:", {
    isEntrepreneur,
    entrepreneurId,
    projectEntrepreneurId: project?.id_entrepreneur,
    projectStatus: project?.status,
    selectedStudent: project?.selected_student,
    showProposedStudents
  });

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Student Proposal Actions - Show for students with pending proposals */}
          {isStudent && proposalStatus && studentId && (
            <div className="mb-6">
              <StudentProposalActions
                projectId={project.id_project}
                studentId={studentId}
                proposalStatus={proposalStatus}
                onStatusChange={handleProposalStatusChange}
              />
            </div>
          )}

          {/* Proposed Students Section - Show for entrepreneurs when project is in Selection */}
          {showProposedStudents && (
            <div className="mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Proposed Students - Make Your Selection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StudentSelectionView
                    projectId={project.id_project}
                    onStudentSelected={handleStudentSelected}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Student Selection Section - Show for entrepreneurs */}
          {showStudentSelection && !showProposedStudents && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Student Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500">Waiting for admin to propose students for your project.</p>
                  <p className="text-sm text-gray-400 mt-2">You will be able to select from proposed students once they are available.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Header Card - Contains title, status, price, and discussion link */}
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
                    {/* Discussion Link */}
                    <Link to="/messages" className="flex items-center">
                      <Button variant="outline" size="sm" className="relative">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Discussion
                        {hasUnreadMessages && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                        )}
                      </Button>
                    </Link>
                  </div>
                </div>
                {/* Project price display */}
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

          {/* Project Description Card */}
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

          {/* People Information Cards - Entrepreneur and Student */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Entrepreneur Information Card */}
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

            {/* Student Information Card - Only shown if a student is assigned */}
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

          {/* Documents Management Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Project Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document Upload Component */}
              <DocumentUpload 
                projectId={project.id_project} 
                onDocumentSubmit={handleDocumentSubmit}
              />

              {/* Documents List Display */}
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

          {/* Review Section - Only shown for completed projects with assigned students */}
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
