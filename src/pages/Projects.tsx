
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Calendar, DollarSign, User, Clock, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { getStudentProposals } from "@/services/proposal-service";
import { StudentProject } from "@/types";

const Projects = () => {
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<StudentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const userRole = (user as any)?.role;

  const statusOptions = [
    { value: "all", label: "Tous les Projets" },
    { value: "STEP1", label: "Nouveau" },
    { value: "STEP2", label: "Propositions" },
    { value: "STEP3", label: "Sélection" },
    { value: "STEP4", label: "Paiement" },
    { value: "STEP5", label: "Actif" },
    { value: "STEP6", label: "En Cours" },
    { value: "completed", label: "Terminé" }
  ];

  // Ajouter les options de filtre de statut de proposition pour les étudiants
  const studentStatusOptions = [
    { value: "all", label: "Tous" },
    { value: "pending", label: "Réponse en Attente" },
    { value: "accepted", label: "Intéressé" },
    { value: "declined", label: "Refusé" },
    { value: "assigned", label: "Assigné" }
  ];

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [projects, searchTerm, statusFilter]);

  const fetchProjects = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("Récupération des projets pour l'utilisateur:", user.id, "rôle:", userRole);
      
      if (userRole === "entrepreneur") {
        // Les entrepreneurs ne voient que leurs propres projets
        const { data: entrepreneurData } = await supabase
          .from("entrepreneurs")
          .select("id_entrepreneur")
          .eq("id_user", user.id)
          .single();
          
        if (entrepreneurData) {
          const { data, error } = await supabase
            .from("projects")
            .select(`
              id_project,
              title,
              description,
              status,
              created_at,
              updated_at,
              price,
              id_entrepreneur,
              selected_student,
              entrepreneurs (
                users (name, surname)
              )
            `)
            .eq("id_entrepreneur", entrepreneurData.id_entrepreneur)
            .order("created_at", { ascending: false });

          if (error) {
            console.error("Erreur lors de la récupération des projets d'entrepreneur:", error);
            throw error;
          }

          console.log("Projets d'entrepreneur récupérés:", data?.length || 0);
          const transformedProjects: StudentProject[] = (data || []).map(project => ({
            id: project.id_project,
            title: project.title,
            description: project.description || '',
            ownerId: project.id_entrepreneur,
            assigneeId: project.selected_student,
            status: project.status as StudentProject['status'],
            tasks: [],
            documents: [],
            createdAt: new Date(project.created_at),
            updatedAt: new Date(project.updated_at || project.created_at),
            price: project.price,
            entrepreneur: project.entrepreneurs
          }));
          const sortedProjects = sortProjectsByStatus(transformedProjects);
          setProjects(sortedProjects);
        }
      } else if (userRole === "student") {
        // Les étudiants voient à la fois les projets assignés et les propositions
        const { data: studentData } = await supabase
          .from("students")
          .select("id_student")
          .eq("id_user", user.id)
          .single();
          
        if (studentData) {
          // Obtenir toutes les propositions pour cet étudiant
          const proposals = await getStudentProposals(studentData.id_student);
          
          // Transformer les propositions en format de projet
          const projectsFromProposals: StudentProject[] = proposals.map(proposal => ({
            id: proposal.projects.id_project,
            title: proposal.projects.title,
            description: proposal.projects.description || '',
            ownerId: proposal.projects.id_entrepreneur,
            assigneeId: proposal.projects.selected_student,
            status: proposal.projects.status as StudentProject['status'],
            tasks: [],
            documents: [],
            createdAt: new Date(proposal.created_at),
            updatedAt: new Date(proposal.projects.updated_at || proposal.created_at),
            price: proposal.projects.price,
            proposalStatus: proposal.accepted === null ? 'pending' : (proposal.accepted ? 'accepted' : 'declined'),
            entrepreneur: proposal.projects.entrepreneurs
          }));

          // Obtenir les projets où l'étudiant est assigné
          const { data: assignedProjects, error: assignedError } = await supabase
            .from("projects")
            .select(`
              id_project,
              title,
              description,
              status,
              created_at,
              updated_at,
              price,
              id_entrepreneur,
              selected_student,
              entrepreneurs (
                users (name, surname)
              )
            `)
            .eq("selected_student", studentData.id_student)
            .order("created_at", { ascending: false });

          if (assignedError) {
            console.error("Erreur lors de la récupération des projets assignés:", assignedError);
          }

          // Marquer les projets assignés
          const assignedProjectsWithStatus: StudentProject[] = (assignedProjects || []).map(project => ({
            id: project.id_project,
            title: project.title,
            description: project.description || '',
            ownerId: project.id_entrepreneur,
            assigneeId: project.selected_student,
            status: project.status as StudentProject['status'],
            tasks: [],
            documents: [],
            createdAt: new Date(project.created_at),
            updatedAt: new Date(project.updated_at || project.created_at),
            price: project.price,
            proposalStatus: 'assigned' as const,
            entrepreneur: project.entrepreneurs
          }));

          // Combiner tous les projets et supprimer les doublons
          const allProjects = [...projectsFromProposals, ...assignedProjectsWithStatus];
          const uniqueProjects = allProjects.filter((project, index, self) =>
            index === self.findIndex(p => p.id === project.id)
          );

          console.log("Projets d'étudiant récupérés:", uniqueProjects.length);
          const sortedProjects = sortProjectsByStatus(uniqueProjects);
          setProjects(sortedProjects);
        }
      } else if (userRole === "admin") {
        // Les admins voient tous les projets
        const { data, error } = await supabase
          .from("projects")
          .select(`
            id_project,
            title,
            description,
            status,
            created_at,
            updated_at,
            price,
            id_entrepreneur,
            selected_student,
            entrepreneurs (
              users (name, surname)
            )
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Erreur lors de la récupération des projets d'admin:", error);
          throw error;
        }

        console.log("Projets d'admin récupérés:", data?.length || 0);
        const transformedProjects: StudentProject[] = (data || []).map(project => ({
          id: project.id_project,
          title: project.title,
          description: project.description || '',
          ownerId: project.id_entrepreneur,
          assigneeId: project.selected_student,
          status: project.status as StudentProject['status'],
          tasks: [],
          documents: [],
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at || project.created_at),
          price: project.price,
          entrepreneur: project.entrepreneurs
        }));
        const sortedProjects = sortProjectsByStatus(transformedProjects);
        setProjects(sortedProjects);
      }
      
    } catch (error: any) {
      console.error("Erreur lors de la récupération des projets:", error);
      toast.error("Échec du chargement des projets");
    } finally {
      setLoading(false);
    }
  };

  const sortProjectsByStatus = (projectsList: StudentProject[]) => {
    const statusPriority: { [key: string]: number } = {
      'STEP1': 1,  // Nouveau
      'STEP2': 2,  // Propositions
      'STEP3': 3,  // Sélection
      'STEP4': 4,  // Paiement
      'STEP5': 5,  // Actif
      'STEP6': 6,  // En Cours
      'completed': 7,
      'open': 1,   // Fallback pour statut legacy
      'in_progress': 6,  // Fallback pour statut legacy
    };

    return [...projectsList].sort((a, b) => {
      // Pour les étudiants, prioriser d'abord les propositions en attente
      if (userRole === 'student') {
        if (a.proposalStatus === 'pending' && b.proposalStatus !== 'pending') return -1;
        if (b.proposalStatus === 'pending' && a.proposalStatus !== 'pending') return 1;
      }

      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;
      
      // Trier d'abord par priorité de statut
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Puis trier par date de création (plus récent en premier) dans le même statut
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const applyFilters = () => {
    let filtered = projects;

    // Appliquer le filtre de recherche
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower)
      );
    }

    // Appliquer le filtre de statut
    if (statusFilter !== "all") {
      if (userRole === 'student') {
        // Pour les étudiants, filtrer par statut de proposition
        filtered = filtered.filter(project => project.proposalStatus === statusFilter);
      } else {
        // Pour les entrepreneurs et admins, filtrer par statut de projet
        filtered = filtered.filter(project => project.status === statusFilter);
      }
    }

    setFilteredProjects(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "step1":
      case "open": 
        return "bg-yellow-100 text-yellow-800";
      case "step2": 
        return "bg-blue-100 text-blue-800";
      case "step3": 
        return "bg-purple-100 text-purple-800";
      case "step4": 
        return "bg-orange-100 text-orange-800";
      case "step5": 
        return "bg-green-100 text-green-800";
      case "step6":
      case "in_progress": 
        return "bg-indigo-100 text-indigo-800";
      case "completed": 
        return "bg-gray-100 text-gray-800";
      default: 
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProposalStatusColor = (proposalStatus: string) => {
    switch (proposalStatus) {
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'accepted':
        return "bg-blue-100 text-blue-800";
      case 'declined':
        return "bg-red-100 text-red-800";
      case 'assigned':
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProposalStatusIcon = (proposalStatus: string) => {
    switch (proposalStatus) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'accepted':
        return <CheckCircle className="h-3 w-3" />;
      case 'declined':
        return <XCircle className="h-3 w-3" />;
      case 'assigned':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'STEP1': 'Nouveau',
      'STEP2': 'Propositions',
      'STEP3': 'Sélection',
      'STEP4': 'Paiement',
      'STEP5': 'Actif',
      'STEP6': 'En Cours',
      'open': 'Ouvert',
      'in_progress': 'En Cours',
      'completed': 'Terminé'
    };
    return statusMap[status] || status?.replace('_', ' ').toUpperCase() || 'Inconnu';
  };

  const getProposalStatusDisplay = (proposalStatus: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Réponse en Attente',
      'accepted': 'Intéressé',
      'declined': 'Refusé',
      'assigned': 'Assigné'
    };
    return statusMap[proposalStatus] || proposalStatus;
  };

  const canCreateProject = () => {
    return userRole === "entrepreneur";
  };

  const currentStatusOptions = userRole === 'student' ? studentStatusOptions : statusOptions;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* En-tête de Page avec Titre et Bouton Créer */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-left text-2xl sm:text-3xl font-bold text-gray-900">Projets</h1>
              <p className="text-gray-600 mt-1">
                {userRole === "student" && "Propositions de projets et assignations"}
                {userRole === "entrepreneur" && "Vos projets"}
                {userRole === "admin" && "Tous les projets du système"}
              </p>
            </div>
            {canCreateProject() && (
              <Button asChild className="bg-tiro-primary hover:bg-tiro-primary/90">
                <Link to="/pack-selection">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Projet
                </Link>
              </Button>
            )}
          </div>

          {/* Contrôles de Recherche et Filtre */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Input de Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Rechercher des projets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Menu Déroulant de Filtre de Statut */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiro-primary focus:border-transparent bg-white min-w-[160px]"
              >
                {currentStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grille de Projets */}
          {loading ? (
            /* État de Chargement */
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-primary"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            /* État Vide */
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">
                {searchTerm || statusFilter !== "all" 
                  ? "Aucun projet ne correspond à vos filtres" 
                  : userRole === "student"
                  ? "Aucun projet ou proposition pour le moment"
                  : "Aucun projet trouvé"
                }
              </div>
              {canCreateProject() && !searchTerm && statusFilter === "all" && (
                <Button asChild className="mt-4 bg-tiro-primary hover:bg-tiro-primary/90">
                  <Link to="/pack-selection">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer Votre Premier Projet
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            /* Grille de Projets */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block"
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${getStatusColor(project.status)} text-xs`}>
                            {getStatusDisplay(project.status)}
                          </Badge>
                          {project.proposalStatus && (
                            <Badge 
                              className={`${getProposalStatusColor(project.proposalStatus)} text-xs flex items-center gap-1`}
                            >
                              {getProposalStatusIcon(project.proposalStatus)}
                              {getProposalStatusDisplay(project.proposalStatus)}
                            </Badge>
                          )}
                        </div>
                        {project.price && (
                          <div className="flex items-center text-sm text-tiro-primary font-semibold">
                            <DollarSign className="h-4 w-4 mr-1" />
                            €{project.price.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-lg font-semibold line-clamp-2 min-h-[3.5rem]">
                        {project.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4 min-h-[4.5rem]">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                        {project.entrepreneur?.users && (
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {project.entrepreneur.users.name} {project.entrepreneur.users.surname}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Projects;
