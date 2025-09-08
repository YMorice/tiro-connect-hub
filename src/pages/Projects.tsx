import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Calendar, BadgeEuro, User, Clock, CheckCircle, XCircle } from "lucide-react";
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

  const studentStatusOptions = [
    { value: "all", label: "Tous" },
    { value: "pending", label: "Réponse en Attente" },
    { value: "accepted", label: "Intéressé" },
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
          const { data, error } = (await supabase
            .from("projects")
            .select(`
              id_project,
              title,
              description,
              devis,
              status,
              created_at,
              updated_at,
              deadline,
              price,
              id_entrepreneur,
              selected_student,
              project_packs (
                name
              ),
              entrepreneurs (
                users (name, surname)
              )
            `)
            .eq("id_entrepreneur", entrepreneurData.id_entrepreneur)
            .order("created_at", { ascending: false })) as any;

          if (error) {
            console.error("Erreur lors de la récupération des projets d'entrepreneur:", error);
            throw error;
          }

          console.log("Projets d'entrepreneur récupérés:", data?.length || 0);
          const transformedProjects: StudentProject[] = (data || []).map(project => ({
            id: project.id_project,
            title: project.title,
            description: project.devis || project.description || '',
            ownerId: project.id_entrepreneur,
            assigneeId: project.selected_student,
            status: project.status as StudentProject['status'],
            tasks: [],
            documents: [],
            createdAt: new Date(project.created_at),
            updatedAt: new Date(project.updated_at || project.created_at),
            deadline: project.deadline ? new Date(project.deadline) : null, 
            price: project.price,
            pack: project.project_packs,
            entrepreneur: project.entrepreneurs
          }));
          const sortedProjects = sortProjectsByStatus(transformedProjects);
          setProjects(sortedProjects);
        }
      } else if (userRole === "student") {
        // Les étudiants voient seulement les projets où ils sont assignés ou les propositions en cours
        const { data: studentData } = await supabase
          .from("students")
          .select("id_student")
          .eq("id_user", user.id)
          .single();
          
        if (studentData) {
          // Obtenir les propositions en cours (non rejetées et où l'étudiant n'a pas été écarté)
          const proposals = await getStudentProposals(studentData.id_student);
          
          // Filtrer les propositions pour exclure les projets où un autre étudiant a été sélectionné
          const validProposals = [];
          for (const proposal of proposals) {
            const { data: projectData } = await supabase
              .from("projects")
              .select("selected_student")
              .eq("id_project", proposal.projects.id_project)
              .single();
              
            // Inclure seulement si :
            // - Aucun étudiant n'est sélectionné (selected_student = null)
            // - OU l'étudiant actuel est celui qui est sélectionné
            if (!projectData?.selected_student || projectData.selected_student === studentData.id_student) {
              validProposals.push(proposal);
            }
          }
          
          // Transformer les propositions valides en format de projet
          const projectsFromProposals: StudentProject[] = validProposals.map(proposal => ({
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
            deadline: proposal.projects.deadline ? new Date(proposal.projects.deadline) : null,
            price: proposal.projects.price,
            pack: proposal.projects.project_packs,
            proposalStatus: proposal.accepted === null ? 'pending' : (proposal.accepted ? 'accepted' : 'declined'),
            entrepreneur: proposal.projects.entrepreneurs
          }));

          // Obtenir les projets où l'étudiant est assigné
          const { data: assignedProjects, error: assignedError } = (await supabase
            .from("projects")
            .select(`
              id_project,
              title,
              description,
              devis,
              status,
              created_at,
              updated_at,
              deadline,
              price,
              id_entrepreneur,
              selected_student,
              project_packs (
                name
              ),
              entrepreneurs (
                users (name, surname)
              )
            `)
            .eq("selected_student", studentData.id_student)
            .order("created_at", { ascending: false })) as any;

          if (assignedError) {
            console.error("Erreur lors de la récupération des projets assignés:", assignedError);
          }

          // Marquer les projets assignés
          const assignedProjectsWithStatus: StudentProject[] = (assignedProjects || []).map(project => ({
            id: project.id_project,
            title: project.title,
            description: project.devis || project.description || '',
            ownerId: project.id_entrepreneur,
            assigneeId: project.selected_student,
            status: project.status as StudentProject['status'],
            tasks: [],
            documents: [],
            createdAt: new Date(project.created_at),
            updatedAt: new Date(project.updated_at || project.created_at),
            deadline: project.deadline ? new Date(project.deadline) : null,
            price: project.price,
            pack: project.project_packs,
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
        const { data, error } = (await supabase
          .from("projects")
          .select(`
            id_project,
            title,
            description,
            devis,
            status,
            created_at,
            updated_at,
            deadline,
            price,
            id_entrepreneur,
            selected_student,
            project_packs (
              name
            ),
            entrepreneurs (
              users (name, surname)
            )
          `)
          .order("created_at", { ascending: false })) as any;

        if (error) {
          console.error("Erreur lors de la récupération des projets d'admin:", error);
          throw error;
        }

        console.log("Projets d'admin récupérés:", data?.length || 0);
        const transformedProjects: StudentProject[] = (data || []).map(project => ({
          id: project.id_project,
          title: project.title,
          description: project.devis || project.description || '',
          ownerId: project.id_entrepreneur,
          assigneeId: project.selected_student,
          status: project.status as StudentProject['status'],
          tasks: [],
          documents: [],
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at || project.created_at),
          deadline: project.deadline ? new Date(project.deadline) : null,
          price: project.price,
          pack: project.project_packs,
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
      'STEP1': 1,
      'STEP2': 2,
      'STEP3': 3,
      'STEP4': 4,
      'STEP5': 5,
      'STEP6': 6,
      'completed': 7,
      'open': 1,
      'in_progress': 6,
    };

    return [...projectsList].sort((a, b) => {
      if (userRole === 'student') {
        if (a.proposalStatus === 'pending' && b.proposalStatus !== 'pending') return -1;
        if (b.proposalStatus === 'pending' && a.proposalStatus !== 'pending') return 1;
      }

      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const applyFilters = () => {
    let filtered = projects;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== "all") {
      if (userRole === 'student') {
        filtered = filtered.filter(project => project.proposalStatus === statusFilter);
      } else {
        filtered = filtered.filter(project => project.status === statusFilter);
      }
    }

    setFilteredProjects(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "step5":
      case "in progress":
        return "bg-blue-100 text-blue-700";
      case "step4":
        return "bg-red-100 text-red-700";
      case "step1":
        return "bg-yellow-100 text-yellow-700";
      case "step3":
        return "bg-purple-100 text-purple-700";
      case "step2":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
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
    <div className="min-h-screen bg-tiro-test py-6">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-left text-3xl sm:text-4xl font-clash text-gray-900 tracking-wide">Projets</h1>
            <p className="text-gray-600 mt-1 text-left">
              {userRole === "student" && "Propositions de projets et assignations"}
              {userRole === "entrepreneur" && "Tous vos projets"}
              {userRole === "admin" && "Tous les projets du système"}
            </p>
          </div>
          {canCreateProject() && (
            <Button asChild className="bg-tiro-primary hover:bg-tiro-primary/70 rounded-[5px]">
              <Link to="/pack-selection">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Projet
              </Link>
            </Button>
          )}
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tiro-gray2 h-4 w-4" />
              <Input
                type="text"
                placeholder="Rechercher des projets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-tiro-white"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-tiro-primary focus:border-transparent bg-tiro-white min-w-[160px]"
            >
              {currentStatusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-primary"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block"
              >
                <Card className="h-full shadow-none transition-colors duration-200 rounded-[5px] bg-tiro-white hover:bg-muted cursor-pointer">
                  <CardHeader className="pb-2">
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
                    </div>
                    <CardTitle className="text-1xl  sm:text-2xl font-clash tracking-wide line-clamp-2 mb-1">
                      {project.title}
                    </CardTitle>
                    {project.pack && (
                      <p className="text-md font-medium text-tiro-black/70 mb-2">
                        {project.pack.name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                      {project.description}
                    </p>
                    <div className="flex justify-between items-center">
                      {project.deadline && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          Deadline&nbsp;:
                          <span className="ml-1 font-medium text-gray-700">
                            {project.deadline.toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {project.price && (
                        <div className="flex items-center text-xs text-gray-500">
                          <BadgeEuro className="h-3 w-3 mr-1" />
                          Prix&nbsp;:
                          <span className="ml-1 font-medium text-gray-700">
                            {userRole === "student" ? Math.round(project.price * 0.75).toLocaleString() : project.price.toLocaleString()}€
                          </span>
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
  );
};

export default Projects;
