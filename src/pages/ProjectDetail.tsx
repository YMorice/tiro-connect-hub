/**
 * Project Detail Page Component
 * 
 * This component displays comprehensive information about a specific project including:
 * - Project metadata (title, description, status, price, deadline)
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
import {ProjectPayment} from "@/components/payment/ProjectPayment";
import { Download, FileText, Calendar, User, BadgeEuro, MessageCircle, Users, Clock, CheckCircle, UserCheck } from "lucide-react";
import { format } from "date-fns";
import PaymentStatusMessage from "@/components/PaymentStatusMessage";

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
  /** Project deadline */
  deadline?: string;
  /** ID of the entrepreneur who owns the project */
  id_entrepreneur: string;
  /** ID of the selected student (if any) */
  selected_student?: string;
  /** Payment status of the project */
  payment_status?: string;
  /** Stripe payment intent ID */
  stripe_payment_intent_id?: string;
  /** Paid at timestamp */
  paid_at?: string;
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
  const [isSelectedForProject, setIsSelectedForProject] = useState(false);

  // Fetch project data when component mounts or dependencies change
  useEffect(() => {
    if (user && id && isValidUUID) {
      fetchProject();
      checkUnreadMessages();
      if ((user as any)?.role === 'student') {
        checkProposalStatus();
        checkIfSelectedForProject();
      }
      if ((user as any)?.role === 'entrepreneur') {
        fetchEntrepreneurId();
      }
    }
  }, [user, id, isValidUUID]);

  // Ajout de logs pour le debug côté étudiant
  useEffect(() => {
    console.log("user", user); // Affiche l'utilisateur connecté
    console.log("user.id", user?.id); // Affiche l'UUID utilisateur
    console.log("project", project); // Affiche le projet courant
    console.log("studentId", studentId); // Affiche l'id_student détecté côté front
    console.log("projectId", project?.id_project); // Affiche l'id du projet courant
    console.log("proposalStatus", proposalStatus); // Affiche le statut de la proposition
    console.log("isSelectedForProject", isSelectedForProject);
  }, [user, project, studentId, proposalStatus, isSelectedForProject]);

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
   * Checks if the current user is selected for this project
   */
  const checkIfSelectedForProject = async () => {
    if (!user?.id || !id) return;

    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id_student')
        .eq('id_user', user.id)
        .single();

      if (studentData) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('selected_student')
          .eq('id_project', id)
          .eq('selected_student', studentData.id_student)
          .single();

        setIsSelectedForProject(!!projectData);
      }
    } catch (error) {
      console.error('Error checking if selected for project:', error);
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
        entrepreneur: Array.isArray(projectData.entrepreneurs)
          ? projectData.entrepreneurs[0]
          : projectData.entrepreneurs,
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
  const downloadDocument = async (doc: ProjectDocument) => {
    try {
      // DEBUG : Afficher la valeur de doc.link
      console.log('DEBUG doc.link:', doc.link);
      const url = new URL(doc.link);
      const parts = url.pathname.split('/');
      console.log('DEBUG parts:', parts);
      const documentsIndex = parts.findIndex(p => p.toLowerCase() === "documents");
      console.log('DEBUG documentsIndex:', documentsIndex);
      const filePath = documentsIndex !== -1 ? parts.slice(documentsIndex + 1).join('/') : null;
      console.log('DEBUG filePath:', filePath);

      if (!filePath) {
        toast.error("Chemin du fichier introuvable dans le lien");
        return;
      }

      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) {
        toast.error("Erreur lors du téléchargement du document");
        return;
      }

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name || 'document';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Téléchargement lancé !");
      }
    } catch (err) {
      toast.error("Erreur inattendue lors du téléchargement");
      console.error(err);
    }
  };

  /**
   * Returns appropriate CSS classes for status badges based on project status
   * 
   * @param status - The project status string
   * @returns CSS classes for styling the status badge
   */
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700"; // ✅ vert
      case "step5":
      case "in progress":
        return "bg-blue-100 text-blue-700"; // ✅ bleu
      case "step4":
        return "bg-red-100 text-red-700"; // ✅ rouge
      case "step1":
        return "bg-yellow-100 text-yellow-700"; // ✅ jaune
      case "step3":
        return "bg-purple-100 text-purple-700"; // ✅ violet
      case "step2":
        return "bg-orange-100 text-orange-700"; // ✅ orange
      default:
        return "bg-gray-100 text-gray-700";
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
      'STEP1': 'Nouveau',
      'STEP2': 'Propositions',
      'STEP3': 'Sélection',
      'STEP4': 'Paiement',
      'STEP5': 'Actif',
      'STEP6': 'Terminé'
    };
    return statusMap[status] || status?.replace('_', ' ').toUpperCase() || 'Unknown';
  };

  // Handles successful payment completion
  // Refreshes the project data to reflect the payment status change
  const handlePaymentSuccess = () => {
    // Refresh project data to show updated status
    fetchProject();
    toast.success("Payment successful! Your project is now active.");
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
        const { data: proposalData, error: proposalError } = await supabase
          .from('proposal_to_student')
          .select('accepted')
          .eq('id_project', id)
          .eq('id_student', studentData.id_student)
          .single();

        console.log("Résultat requête proposal_to_student :", { proposalData, proposalError });

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

  const forceUpdateStatusToStep2 = async () => {
    if ((user as any)?.role !== "admin") {
      toast.error("Seuls les administrateurs peuvent forcer le passage à l'étape 2.");
      return;
    }

    if (!project?.id_project) {
      toast.error("Projet introuvable.");
      return;
    }

    try {
      console.log("Tentative de passage du projet à STEP2", project.id_project);

      // On tente la mise à jour
      const { data, error } = await supabase
        .from('projects')
        .update({ status: 'STEP2' })
        .eq('id_project', project.id_project)
        .select();

      if (error) {
        console.error("Erreur lors de la mise à jour du statut du projet :", error);
        toast.error("Erreur lors de la mise à jour : " + (error.message || "inconnue"));
        return;
      }

      if (!data || data.length === 0) {
        toast.error("Aucune ligne modifiée. Vérifiez vos droits ou la politique RLS.");
        console.warn("Résultat update vide :", data);
        return;
      }

      toast.success("Le projet est passé à l'étape 2 (STEP2) !");
      fetchProject(); // Recharge les données du projet
    } catch (err) {
      console.error("Erreur inattendue :", err);
      toast.error("Erreur inattendue lors du passage à STEP2.");
    }
  };

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-primary"></div>
      </div>
    );
  }

  // Show error state if project not found
  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Project not found</h1>
          <p className="text-gray-600">The project you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
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

  // Show payment section if user is entrepreneur, owns project, and project is in STEP4
  const showPaymentSection = isEntrepreneur && 
    entrepreneurId &&
    project?.id_entrepreneur === entrepreneurId && 
    project?.status === 'STEP4' &&
    project?.price > 0;

  console.log("Debug info:", {
    isEntrepreneur,
    entrepreneurId,
    projectEntrepreneurId: project?.id_entrepreneur,
    projectStatus: project?.status,
    selectedStudent: project?.selected_student,
    showProposedStudents,
    showPaymentSection,
    projectPrice: project?.price
  });

  return (
    <div className="min-h-screen bg-tiro-test">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        {/* Notification pour étudiant sélectionné */}
        {isStudent && isSelectedForProject && (
          <div className="mb-4 sm:mb-6">
            <Card className="border-l-4 border-l-green-500 bg-green-50">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-green-800">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Félicitations ! Vous avez été sélectionné pour ce projet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-800 font-medium">
                      L'entrepreneur vous a choisi pour travailler sur ce projet
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Vous pouvez maintenant collaborer directement avec l'entrepreneur et accéder à tous les documents du projet.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Section - Show for entrepreneurs when project is in STEP4 */}
        {showPaymentSection && (
          <div className="mb-4 sm:mb-6">
            <ProjectPayment
              projectId={project.id_project}
              projectTitle={project.title}
              amount={project.price}
              paymentStatus={project.payment_status as 'pending' | 'succeeded' | 'processing' | 'failed'}
              onPaymentSuccess={handlePaymentSuccess}
            />
          </div>
        )}

        {/* Payment Status Message - Show for students when their assigned project is in STEP4 */}
        {isStudent && 
          project?.selected_student && 
          studentId === project.selected_student && 
          project.status === 'STEP4' && (
          <div className="mb-4 sm:mb-6">
            <PaymentStatusMessage projectStatus={project.status} />
          </div>
        )}

        {/* Student Proposal Actions - Show for students with pending proposals */}
        {isStudent && proposalStatus && studentId && (
          <div className="mb-4 sm:mb-6">
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
          <div className="mb-4 sm:mb-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
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
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Student Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-500 text-sm sm:text-base">Waiting for admin to propose students for your project.</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">You will be able to select from proposed students once they are available.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Header Card - Contains title, status, price, deadline, and discussion link */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 break-words leading-tight">
                  {project.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge className={`${getStatusColor(project.status)} text-xs sm:text-sm`}>
                    {getStatusDisplay(project.status)}
                  </Badge>
                  {/* Discussion Link */}
                  <Link to="/messages" className="flex items-center">
                    <Button variant="outline" size="sm" className="relative text-xs sm:text-sm">
                      <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Aller à la Discussion</span>
                      <span className="sm:hidden">Chat</span>
                      {hasUnreadMessages && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                      )}
                    </Button>
                  </Link>
                </div>
                {(user as any)?.role === 'admin' && project.status === 'STEP1' && (
                  <Button
                    onClick={forceUpdateStatusToStep2}
                    variant="outline"
                    size="sm"
                  >
                    Forcer passage à STEP2
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Project Description Card */}
        {project.description && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 text-left">
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                {project.deadline && (
                  <p className="text-sm sm:text-base text-gray-800">
                    <Clock className="inline-block h-4 w-4 mr-1 text-gray-500 align-middle" />
                    <span className="font-semibold">Deadline :</span> {new Date(project.deadline).toLocaleDateString()}
                  </p>
                )}
                {project.price && (
                  <p className="text-sm sm:text-base text-tiro-primary font-semibold">
                    <BadgeEuro className="inline-block h-4 w-4 mr-1 align-middle" />
                    <span className="font-semibold">Prix :</span> {project.price.toLocaleString()}€
                  </p>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* People Information Cards - Entrepreneur and Student */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6r">
          {/* Entrepreneur Information Card */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center">
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Entrepreneur
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.entrepreneur?.users ? (
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                    {project.entrepreneur.users.pp_link ? (
                      <AvatarImage 
                        src={project.entrepreneur.users.pp_link}
                        alt={project.entrepreneur.users.name}
                      />
                    ) : (
                      <AvatarFallback className="bg-tiro-primary text-white text-sm sm:text-base">
                        {project.entrepreneur.users.name?.charAt(0) || "E"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base text-left truncate">{project.entrepreneur.users.name}</p>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 italic">Informations entrepreneur non disponibles</div>
              )}
            </CardContent>
          </Card>

          {/* Student Information Card - Only shown if a student is assigned */}
          {project.student && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Étudiant.e Sélectionné.e
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                    {project.student?.users?.pp_link ? (
                      <AvatarImage 
                        src={project.student.users.pp_link}
                        alt={project.student.users.name}
                      />
                    ) : (
                      <AvatarFallback className="bg-tiro-primary text-white text-sm sm:text-base">
                        {project.student?.users?.name?.charAt(0) || "S"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base text-left truncate">{project.student?.users?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Documents Management Section */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Documents du Projet
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
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Uploaded Documents</h4>
                <div className="grid gap-2 sm:gap-3">
                  {project.documents.map((doc) => (
                    <div 
                      key={doc.id_document}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate text-sm sm:text-base">{doc.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {doc.type} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {/* Téléchargement uniquement sur clic du bouton */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadDocument(doc)}
                        className="flex-shrink-0 p-2"
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4 text-sm sm:text-base">Aucun document téléversé pour le moment.</p>
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
  );
};

export default ProjectDetail;
