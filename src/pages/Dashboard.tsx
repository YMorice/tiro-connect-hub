
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "@/context/project-context";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { Briefcase, Users, CheckCircle, Clock, DollarSign, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { projects } = useProjects();
  const { user } = useAuth();

  // Get project counts by status (using English status values)
  const activeProjects = projects.filter(p => p.status === "Active" || p.status === "In progress").length;
  const completedProjects = projects.filter(p => p.status === "completed").length;
  const newProjects = projects.filter(p => p.status === "New" || p.status === "Proposals").length;

  const totalProjects = projects.length;

  // Calculate completion rate
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  const stats = [
    {
      title: "Projets Totaux",
      value: totalProjects,
      description: "Nombre total de projets",
      icon: Briefcase,
      color: "text-blue-600"
    },
    {
      title: "Projets Actifs",
      value: activeProjects,
      description: "Projets en cours de réalisation",
      icon: Clock,
      color: "text-orange-600"
    },
    {
      title: "Projets Terminés",
      value: completedProjects,
      description: "Projets complétés avec succès",
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Nouveaux Projets",
      value: newProjects,
      description: "En attente de propositions",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Taux de Réussite",
      value: `${completionRate}%`,
      description: "Pourcentage de projets terminés",
      icon: TrendingUp,
      color: "text-emerald-600"
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "New": { label: "Nouveau", variant: "secondary" as const },
      "Proposals": { label: "Propositions", variant: "outline" as const },
      "Selection": { label: "Sélection", variant: "outline" as const },
      "Payment": { label: "Paiement", variant: "outline" as const },
      "Active": { label: "Actif", variant: "default" as const },
      "In progress": { label: "En cours", variant: "default" as const },
      "completed": { label: "Terminé", variant: "secondary" as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bonjour, {user?.name || "Utilisateur"} 👋
          </h1>
          <p className="text-muted-foreground">
            Voici un aperçu de vos projets et activités récentes.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Projets Récents
            </CardTitle>
            <CardDescription>
              Vos projets les plus récents et leur statut actuel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Aucun projet trouvé.</p>
                <p className="text-sm text-muted-foreground">
                  Commencez par créer votre premier projet !
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-medium">{project.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {project.description || "Aucune description"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                ))}
                
                {projects.length > 5 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      Et {projects.length - 5} projet(s) de plus...
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
