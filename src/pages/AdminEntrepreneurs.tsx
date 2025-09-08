import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { Users, Search, Filter, Building2, Mail, Phone, MapPin, Calendar } from "lucide-react";

interface Entrepreneur {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  company_role: string | null;
  company_siret: string | null;
  address: string | null;
  created_at: string;
  projectCount: number;
}

const AdminEntrepreneurs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (user && (user as any).role !== "admin") {
      navigate("/dashboard");
      toast.error("Vous n'avez pas l'autorisation d'accéder à cette page");
    }
  }, [user, navigate]);

  // Fetch entrepreneurs with project counts
  useEffect(() => {
    const fetchEntrepreneurs = async () => {
      try {
        setLoading(true);
        
        const { data: entrepreneursData, error } = await supabase
          .from('entrepreneurs')
          .select(`
            id_entrepreneur,
            company_name,
            company_role,
            company_siret,
            address,
            users (
              id_users,
              name,
              surname,
              email,
              phone,
              created_at
            )
          `)
          .order('id_entrepreneur', { ascending: false });
          
        if (error) {
          throw error;
        }

        if (!entrepreneursData) {
          setEntrepreneurs([]);
          return;
        }

        // Fetch project counts for each entrepreneur
        const entrepreneursWithProjects = await Promise.all(
          (entrepreneursData as any[]).map(async (entrepreneur) => {
            const { data: projectsData, error: projectsError } = await supabase
              .from('projects')
              .select('id_project')
              .eq('id_entrepreneur', entrepreneur.id_entrepreneur);

            const projectCount = !projectsError && projectsData ? projectsData.length : 0;

            return {
              id: entrepreneur.id_entrepreneur,
              name: entrepreneur.users?.name || "",
              surname: entrepreneur.users?.surname || "",
              email: entrepreneur.users?.email || "",
              phone: entrepreneur.users?.phone,
              company_name: entrepreneur.company_name,
              company_role: entrepreneur.company_role,
              company_siret: entrepreneur.company_siret,
              address: entrepreneur.address,
              created_at: entrepreneur.users?.created_at || new Date().toISOString(),
              projectCount,
            };
          })
        );
        
        setEntrepreneurs(entrepreneursWithProjects);
      } catch (error) {
        console.error('Erreur lors du chargement des entrepreneurs:', error);
        toast.error("Échec du chargement des entrepreneurs");
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch once when component mounts and user is admin
    if (user && (user as any).role === "admin" && entrepreneurs.length === 0) {
      fetchEntrepreneurs();
    }
  }, [user, entrepreneurs.length]);

  // Filter entrepreneurs based on search query and filters
  const filteredEntrepreneurs = entrepreneurs.filter(entrepreneur => {
    const fullName = `${entrepreneur.name} ${entrepreneur.surname}`.toLowerCase();
    const matchesSearch = searchQuery.trim() === "" || 
      fullName.includes(searchQuery.toLowerCase()) ||
      entrepreneur.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entrepreneur.company_name && entrepreneur.company_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCompany = companyFilter === "" || 
      (entrepreneur.company_name && entrepreneur.company_name.toLowerCase().includes(companyFilter.toLowerCase()));
    
    return matchesSearch && matchesCompany;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setCompanyFilter("");
  };

  const getCompanyOptions = () => {
    const companies = entrepreneurs
      .map(entrepreneur => entrepreneur.company_name)
      .filter((company): company is string => company !== null)
      .filter((company, index, arr) => arr.indexOf(company) === index);
    return companies.sort();
  };

  if (!user || (user as any).role !== "admin") {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-full p-4 space-y-4">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Gestion des Entrepreneurs</h1>
            <p className="text-muted-foreground text-sm">Gérer les profils entrepreneurs et leurs entreprises</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Total Entrepreneurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{entrepreneurs.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Entreprises Uniques</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">
                {getCompanyOptions().length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Total Projets</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">
                {entrepreneurs.reduce((sum, e) => sum + e.projectCount, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Liste des Entrepreneurs</CardTitle>
            <CardDescription className="text-sm">Gérer les profils entrepreneurs et leurs informations</CardDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, email ou entreprise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="w-[150px] h-9 text-sm">
                    <SelectValue placeholder="Entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les entreprises</SelectItem>
                    {getCompanyOptions().map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchQuery || companyFilter) && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 text-sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Effacer
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm w-[200px]">Entrepreneur</TableHead>
                        <TableHead className="text-sm w-[200px]">Entreprise</TableHead>
                        <TableHead className="text-sm w-[120px]">Rôle</TableHead>
                        <TableHead className="text-sm w-[100px]">Projets</TableHead>
                        <TableHead className="text-sm w-[150px]">Contact</TableHead>
                        <TableHead className="text-sm w-[120px]">Inscription</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntrepreneurs.length > 0 ? (
                        filteredEntrepreneurs.map(entrepreneur => (
                          <TableRow key={entrepreneur.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-semibold text-sm">
                                  {entrepreneur.name} {entrepreneur.surname}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {entrepreneur.email}
                                </div>
                                {entrepreneur.phone && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {entrepreneur.phone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                {entrepreneur.company_name ? (
                                  <>
                                    <div className="font-medium text-sm flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {entrepreneur.company_name}
                                    </div>
                                    {entrepreneur.company_siret && (
                                      <div className="text-xs text-muted-foreground">
                                        SIRET: {entrepreneur.company_siret}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Non renseigné</span>
                                )}
                                {entrepreneur.address && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {entrepreneur.address}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {entrepreneur.company_role ? (
                                <Badge variant="secondary" className="text-xs">
                                  {entrepreneur.company_role}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Non défini</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {entrepreneur.projectCount} projet{entrepreneur.projectCount > 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6 px-2"
                                  onClick={() => window.open(`mailto:${entrepreneur.email}`, '_blank')}
                                >
                                  <Mail className="h-3 w-3 mr-1" />
                                  Email
                                </Button>
                                {entrepreneur.phone && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-6 px-2"
                                    onClick={() => window.open(`tel:${entrepreneur.phone}`, '_blank')}
                                  >
                                    <Phone className="h-3 w-3 mr-1" />
                                    Appeler
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {new Date(entrepreneur.created_at).toLocaleDateString('fr-FR')}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-sm">
                            {entrepreneurs.length > 0 
                              ? "Aucun entrepreneur ne correspond aux critères de recherche" 
                              : "Aucun entrepreneur trouvé"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminEntrepreneurs;