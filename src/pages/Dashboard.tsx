import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Calendar, FolderPlus, MessageCircle, TrendingUp, Plus, FilePlus, CheckCircle, Clock, AlertCircle, HelpCircle, LifeBuoy, UserCheck, UserX, Zap, MessageSquare, UserCog } from "lucide-react";
import { getStudentProposals } from "@/services/proposal-service";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";

const Dashboard = () => {
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const [studentProposals, setStudentProposals] = useState<any[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [rejectedProposals, setRejectedProposals] = useState<any[]>([]);
  const [selectedNotifications, setSelectedNotifications] = useState<any[]>([]);
  const { theme } = useTheme();

  const userRole = (user as any)?.role;

  // Récupérer les propositions d'étudiants si l'utilisateur est un étudiant
  useEffect(() => {
    const fetchStudentData = async () => {
      if (userRole === 'student' && user?.id) {
        setProposalsLoading(true);
        try {
          // Obtenir d'abord l'ID de l'étudiant
          const { data: studentData } = await supabase
            .from('students')
            .select('id_student')
            .eq('id_user', user.id)
            .single();

          if (studentData) {
            // Obtenir les propositions en attente
            const proposals = await getStudentProposals(studentData.id_student);
            setStudentProposals(proposals);

            // Obtenir les propositions rejetées (projets où l'étudiant n'a pas été sélectionné mais le projet a un selected_student)
            const { data: rejectedData, error: rejectedError } = await supabase
              .from('proposal_to_student')
              .select(`
                id_proposal,
                created_at,
                projects!inner (
                  id_project,
                  title,
                  selected_student,
                  status,
                  entrepreneurs (
                    users (name, surname)
                  )
                )
              `)
              .eq('id_student', studentData.id_student)
              .neq('projects.selected_student', null)
              .neq('projects.selected_student', studentData.id_student);

            if (!rejectedError && rejectedData) {
              setRejectedProposals(rejectedData);
            }

            // Obtenir les notifications de sélection (projets où l'étudiant a été sélectionné)
            const { data: selectedData, error: selectedError } = await supabase
              .from('projects')
              .select(`
                id_project,
                title,
                status,
                updated_at,
                deadline,
                student_notification_read,
                entrepreneurs (
                  users (name, surname)
                )
              `)
              .eq('selected_student', studentData.id_student)
              .eq('student_notification_read', false)
              .in('status', ['STEP4', 'STEP5', 'STEP6']);

            if (!selectedError && selectedData) {
              setSelectedNotifications(selectedData);
            }
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données d\'étudiant:', error);
        } finally {
          setProposalsLoading(false);
        }
      }
    };

    fetchStudentData();
  }, [user, userRole]);

  // Fonction pour marquer la notification comme lue
  const markNotificationAsRead = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ student_notification_read: true })
        .eq('id_project', projectId);

      if (!error) {
        // Retirer la notification de la liste locale
        setSelectedNotifications(prev => 
          prev.filter(notif => notif.id_project !== projectId)
        );
      }
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
    }
  };

  // Calculer les métriques du tableau de bord - using English status values for comparison
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === "Active" || p.status === "In progress").length;
  const completedProjects = projects.filter(p => p.status === "completed").length;
  const pendingProjects = projects.filter(p => p.status === "New" || p.status === "Proposals").length;

  const recentProjects = projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  
  console.log("Projets reçus dans Dashboard:", projects);
  console.log("Projets récents:", recentProjects);
  
  const pendingProposals = studentProposals.filter(p => p.accepted === null);

  const getStatusColor = (status: string) => {
    const statusColorMap: { [key: string]: string } = {
      'STEP1': 'bg-blue-100 text-blue-700',
      'STEP2': 'bg-yellow-100 text-yellow-700',
      'STEP3': 'bg-purple-100 text-purple-700', 
      'STEP4': 'bg-orange-100 text-orange-700',
      'STEP5': 'bg-indigo-100 text-indigo-700',
      'STEP6': 'bg-cyan-100 text-cyan-700',
      'completed': 'bg-green-100 text-green-700',
      'new': 'bg-blue-100 text-blue-700',
      'proposals': 'bg-yellow-100 text-yellow-700',
      'selection': 'bg-purple-100 text-purple-700',
      'payment': 'bg-orange-100 text-orange-700', 
      'active': 'bg-indigo-100 text-indigo-700',
      'in progress': 'bg-cyan-100 text-cyan-700'
    };
    return statusColorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'STEP1': 'Nouveau',
      'STEP2': 'Propositions', 
      'STEP3': 'Sélection',
      'STEP4': 'Paiement',
      'STEP5': 'Actif',
      'STEP6': 'En cours',
      'completed': 'Terminé',
      'new': 'Nouveau',
      'proposals': 'Propositions',
      'selection': 'Sélection', 
      'payment': 'Paiement',
      'active': 'Actif',
      'in progress': 'En cours'
    };
    return statusMap[status?.toLowerCase()] || status;
  };

  if (loading || proposalsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiro-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tiro-test">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl  sm:text-4xl font-clash text-tiro-black mb-2 text-left tracking-wide">
                Bon retour, {user?.user_metadata?.name || "Utilisateur"} !
              </h1>
              <p className="text-tiro-black text-left">
                Voici un aperçu de vos projets et de votre activité récente.
              </p>
            </div>
            {userRole === 'entrepreneur' && (
              <Button asChild className="bg-tiro-primary hover:bg-tiro-primary/70">
                <Link to="/pack-selection">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Projet
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Notifications pour les étudiants sélectionnés */}
        {userRole === 'student' && selectedNotifications.length > 0 && (
          <div className="mb-8">
            <Card className="border-l-4 border-l-tiro-secondary">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-tiro-secondary" />
                  Félicitations ! Vous avez été sélectionné
                  <Badge variant="secondary" className="bg-tiro-secondary/10 text-tiro-secondary">{selectedNotifications.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Vous avez été choisi pour travailler sur {selectedNotifications.length > 1 ? 'ces projets' : 'ce projet'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedNotifications.slice(0, 3).map((project) => (
                  <div key={project.id_project} className="flex items-center justify-between p-4 border rounded-lg bg-tiro-white">
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/projects/${project.id_project}`} 
                        className="font-medium text-gray-900 transition-colors truncate block"
                      >
                        {project.title}
                      </Link>
                       <div className="flex items-center mt-1 space-x-2">
                         {project.deadline && (
                           <span className="text-xs text-gray-500">
                             <Calendar className="h-3 w-3 inline mr-1" />
                             Deadline : {new Date(project.deadline).toLocaleDateString('fr-FR')}
                           </span>
                         )}
                       </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/projects/${project.id_project}`}>
                        <Button 
                          size="sm" 
                          className="bg-tiro-secondary text-white hover:bg-tiro-secondary/70"
                          onClick={() => markNotificationAsRead(project.id_project)}
                        >
                          Voir le Projet
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => markNotificationAsRead(project.id_project)}
                      >
                        Marquer comme lu
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications pour les étudiants non sélectionnés */}
        {userRole === 'student' && rejectedProposals.length > 0 && (
          <div className="mb-8">
            <Card className="border-l-4 border-l-tiro-primary">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserX className="h-5 w-5 text-yellow-500" />
                  Projets non retenus
                  <Badge variant="secondary" className="bg-red-100 text-red-800">{rejectedProposals.length}</Badge>
                </CardTitle>
                <CardDescription>
                  L'entrepreneur a choisi un autre étudiant pour {rejectedProposals.length > 1 ? 'ces projets' : 'ce projet'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rejectedProposals.slice(0, 3).map((proposal) => (
                  <div key={proposal.id_proposal} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {proposal.projects.title}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className="text-xs text-gray-500">
                          Par : {proposal.projects.entrepreneurs?.users?.name} {proposal.projects.entrepreneurs?.users?.surname}
                        </span>
                        <span className="text-xs text-red-600">
                          • Un autre étudiant a été sélectionné
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {rejectedProposals.length > 3 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-500">
                      Et {rejectedProposals.length - 3} autres projets...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section Propositions d'Étudiants */}
        {userRole === 'student' && pendingProposals.length > 0 && (
          <div className="mb-8">
            <Card className="border-l-4 border-l-blue-500 bg-tiro-white">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FilePlus className="h-5 w-5 text-blue-500" />
                  Nouvelles Propositions de Projets
                  <Badge variant="secondary">{pendingProposals.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Vous avez de nouvelles propositions de projets en attente de votre réponse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingProposals.slice(0, 3).map((proposal) => (
                  <Link 
                    key={proposal.id_proposal} 
                    to={`/projects/${proposal.projects.id_project}`}
                    className="block p-4 border rounded-lg hover:bg-muted  transition-all cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {proposal.projects.title}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className="text-xs text-gray-500">
                          De : {proposal.projects.entrepreneurs?.users?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(proposal.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                {pendingProposals.length > 3 && (
                  <div className="text-center pt-4">
                    <Link to="/projects">
                      <Button variant="outline">
                        Voir Toutes les Propositions ({pendingProposals.length})
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-tiro-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <CardTitle className="text-xl">Projets Récents</CardTitle>
                  </div>
                  <Link to="/projects">
                    <Button variant="outline" size="sm">
                      Voir Tout
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentProjects.length > 0 ? (
                  recentProjects.map(project => (
                    <Link 
                      key={project.id} 
                      to={`/projects/${project.id}`}
                      className="block p-4 border rounded-[5px] hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground  truncate">
                          {project.title}
                        </div>
                        <div className="flex items-center mt-1 space-x-2">
                          <Badge className={`${getStatusColor(project.status)} text-xs`}>
                            {getStatusLabel(project.status)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(project.updatedAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FolderPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">
                      {userRole === 'student' ? 'Aucun projet assigné pour le moment' : 'Aucun projet pour le moment'}
                    </p>
                    {userRole === 'entrepreneur' && (
                      <Link to="/pack-selection">
                        <Button className="bg-tiro-purple hover:bg-tiro-purple/90">
                          Créer Votre Premier Projet
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="text-left bg-tiro-white">
              <CardHeader className="text-left">
                <CardTitle className="text-lg">Conseils et Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-left">
                <div className="flex items-start space-x-3">
                  <Zap className="h-4 w-4 text-tiro-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {userRole === 'student' ? 'Répondez Rapidement' : 'Restez Professionnel'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {userRole === 'student' 
                        ? 'Des réponses rapides aux propositions augmentent vos chances d\'être sélectionné.'
                        : 'Adoptez une attitude et un ton pro, comme dans toute relation client.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MessageSquare className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Restez Connecté
                    </p>
                    <p className="text-xs text-gray-600">
                      Une communication régulière avec votre étudiant mène à de meilleurs résultats de projet.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <UserCog className="h-4 w-4 text-tiro-secondary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {userRole === 'student' ? 'Mettez à Jour Votre Profil' : 'Exigences Claires'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {userRole === 'student'
                        ? 'Gardez vos compétences et portfolio à jour pour attirer plus de propositions de projets.'
                        : 'Des descriptions de projet détaillées aident les étudiants à livrer exactement ce dont vous avez besoin.'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
