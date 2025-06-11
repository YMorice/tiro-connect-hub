
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/project-context";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Calendar, FolderPlus, MessageCircle, TrendingUp, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { getStudentProposals } from "@/services/proposal-service";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const [studentProposals, setStudentProposals] = useState<any[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);

  const userRole = (user as any)?.role;

  // Récupérer les propositions d'étudiants si l'utilisateur est un étudiant
  useEffect(() => {
    const fetchStudentProposals = async () => {
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
            const proposals = await getStudentProposals(studentData.id_student);
            setStudentProposals(proposals);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des propositions d\'étudiant:', error);
        } finally {
          setProposalsLoading(false);
        }
      }
    };

    fetchStudentProposals();
  }, [user, userRole]);

  // Calculer les métriques du tableau de bord - using English status values for comparison
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === "Active" || p.status === "In progress").length;
  const completedProjects = projects.filter(p => p.status === "completed").length;
  const pendingProjects = projects.filter(p => p.status === "New" || p.status === "Proposals").length;

  // Obtenir les projets récents (5 derniers)
  const recentProjects = projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  
  // Obtenir les propositions en attente pour les étudiants
  const pendingProposals = studentProposals.filter(p => p.accepted === null);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
      case "in progress":
        return "bg-blue-100 text-blue-800";
      case "new":
      case "proposals":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "Terminé";
      case "active":
        return "Actif";
      case "in progress":
        return "En cours";
      case "new":
        return "Nouveau";
      case "proposals":
        return "Propositions";
      case "selection":
        return "Sélection";
      case "payment":
        return "Paiement";
      default:
        return status;
    }
  };

  if (loading || proposalsLoading) {
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
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 text-left">
              Bon retour, {user?.user_metadata?.name || "Utilisateur"} !
            </h1>
            <p className="text-gray-600 text-left">
              Voici un aperçu de vos projets et de votre activité récente.
            </p>
          </div>

          {/* Section Propositions d'Étudiants */}
          {userRole === 'student' && pendingProposals.length > 0 && (
            <div className="mb-8">
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Nouvelles Propositions de Projets
                    <Badge variant="secondary">{pendingProposals.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Vous avez de nouvelles propositions de projets en attente de votre réponse
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingProposals.slice(0, 3).map((proposal) => (
                    <div key={proposal.id_proposal} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/projects/${proposal.projects.id_project}`} 
                          className="font-medium text-gray-900 hover:text-tiro-primary transition-colors truncate block"
                        >
                          {proposal.projects.title}
                        </Link>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className="text-xs text-gray-500">
                            De : {proposal.projects.entrepreneurs?.users?.name} {proposal.projects.entrepreneurs?.users?.surname}
                          </span>
                          <span className="text-xs text-gray-500">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(proposal.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <Link to={`/projects/${proposal.projects.id_project}`}>
                        <Button variant="outline" size="sm">
                          Voir et Répondre
                        </Button>
                      </Link>
                    </div>
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

          {/* Cartes de Métriques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {userRole === 'student' ? 'Projets Disponibles' : 'Total des Projets'}
                </CardTitle>
                <FolderPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  {userRole === 'student' ? 'Projets sur lesquels vous pouvez travailler' : 'Tous vos projets'}
                </p>
              </CardContent>
            </Card>

            {userRole === 'student' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Propositions en Attente
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{pendingProposals.length}</div>
                  <p className="text-xs text-muted-foreground">
                    En attente de votre réponse
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Projets Actifs
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{activeProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Actuellement en cours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Terminés
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{completedProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Terminés avec succès
                </p>
              </CardContent>
            </Card>

            {userRole !== 'student' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    En Attente
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{pendingProjects}</div>
                  <p className="text-xs text-muted-foreground">
                    En attente d'action
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Grille de Contenu Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Projets Récents */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Projets Récents</CardTitle>
                      <CardDescription>
                        Votre dernière activité de projet
                      </CardDescription>
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
                      <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <Link to={`/projects/${project.id}`} className="font-medium text-gray-900 hover:text-tiro-primary transition-colors truncate block">
                            {project.title}
                          </Link>
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
                        <Link to={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm">
                            Voir
                          </Button>
                        </Link>
                      </div>
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

            {/* Actions Rapides */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Actions Rapides</CardTitle>
                  <CardDescription>
                    Tâches courantes et raccourcis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {userRole === 'entrepreneur' && (
                    <Link to="/pack-selection" className="block">
                      <Button className="w-full justify-start">
                        <FolderPlus className="mr-2 h-4 w-4" />
                        Nouveau Projet
                      </Button>
                    </Link>
                  )}
                  <Link to="/projects" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      Voir Tous les Projets
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
              {/* Carte Conseils */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Conseils et Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-tiro-primary mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Restez Professionnel
                      </p>
                      <p className="text-xs text-gray-600">
                        Adoptez une attitude et un ton pro, comme dans toute relation client.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MessageCircle className="h-5 w-5 text-blue-600 mt-1" />
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
                    <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Exigences Claires
                      </p>
                      <p className="text-xs text-gray-600">
                        Des descriptions de projet détaillées aident les étudiants à livrer exactement ce dont vous avez besoin.
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
