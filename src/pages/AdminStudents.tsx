import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { Users, Search, Filter, Star, Crown, Eye, UserCheck, UserX } from "lucide-react";

interface Student {
  id: string;
  name: string;
  surname: string;
  email: string;
  specialty: string | null;
  formation: string | null;
  portfolio_grade: number | null;
  average_rating: number | null;
  is_premium: boolean;
  available: boolean | null;
  created_at: string;
  skills: string[] | null;
  biography: string | null;
}

const AdminStudents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [premiumFilter, setPremiumFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (user && (user as any).role !== "admin") {
      navigate("/dashboard");
      toast.error("Vous n'avez pas l'autorisation d'accéder à cette page");
    }
  }, [user, navigate]);

  // Fetch students with average ratings
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        const { data: studentsData, error } = await supabase
          .from('students')
          .select(`
            id_student,
            specialty,
            formation,
            portfolio_grade,
            is_premium,
            available,
            skills,
            biography,
            users (
              id_users,
              name,
              surname,
              email
            )
          `)
          .order('id_student', { ascending: false });
          
        if (error) {
          throw error;
        }

        if (!studentsData) {
          setStudents([]);
          return;
        }

        // Fetch average ratings for each student
        const studentsWithRatings = await Promise.all(
          (studentsData as any[]).map(async (student) => {
            const { data: reviewsData, error: reviewsError } = await supabase
              .from('reviews')
              .select('rating')
              .eq('student_id', student.id_student);

            let averageRating = null;
            if (!reviewsError && reviewsData && reviewsData.length > 0) {
              const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
              averageRating = Math.round((totalRating / reviewsData.length) * 10) / 10; // Round to 1 decimal
            }

            return {
              id: student.id_student,
              name: student.users?.name || "",
              surname: student.users?.surname || "",
              email: student.users?.email || "",
              specialty: student.specialty,
              formation: student.formation,
              portfolio_grade: student.portfolio_grade,
              average_rating: averageRating,
              is_premium: student.is_premium || false,
              available: student.available,
              created_at: new Date().toISOString(), // Fallback since created_at doesn't exist
              skills: student.skills,
              biography: student.biography,
            };
          })
        );
        
        setStudents(studentsWithRatings);
      } catch (error) {
        console.error('Erreur lors du chargement des étudiants:', error);
        toast.error("Échec du chargement des étudiants");
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch once when component mounts and user is admin
    if (user && (user as any).role === "admin" && students.length === 0) {
      fetchStudents();
    }
  }, [user, students.length]);

  // Filter students based on search query and filters
  const filteredStudents = students.filter(student => {
    const fullName = `${student.name} ${student.surname}`.toLowerCase();
    const matchesSearch = searchQuery.trim() === "" || 
      fullName.includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialty = specialtyFilter === "" || 
      (student.specialty && student.specialty.toLowerCase().includes(specialtyFilter.toLowerCase()));
    
    const matchesPremium = premiumFilter === "" || 
      (premiumFilter === "premium" && student.is_premium) ||
      (premiumFilter === "standard" && !student.is_premium);
    
    const matchesAvailability = availabilityFilter === "" || 
      (availabilityFilter === "available" && student.available) ||
      (availabilityFilter === "unavailable" && !student.available);
    
    return matchesSearch && matchesSpecialty && matchesPremium && matchesAvailability;
  });

  const handleTogglePremium = async (studentId: string, currentPremiumStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_premium: !currentPremiumStatus })
        .eq('id_student', studentId);
        
      if (error) throw error;
      
      // Update local state
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId 
            ? { ...student, is_premium: !currentPremiumStatus }
            : student
        )
      );
      
      toast.success(
        currentPremiumStatus 
          ? "Profil premium retiré avec succès" 
          : "Profil premium activé avec succès"
      );
    } catch (error) {
      console.error('Erreur lors de la modification du statut premium:', error);
      toast.error("Échec de la modification du statut premium");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSpecialtyFilter("");
    setPremiumFilter("");
    setAvailabilityFilter("");
  };

  const getSpecialtyOptions = () => {
    const specialties = students
      .map(student => student.specialty)
      .filter((specialty): specialty is string => specialty !== null)
      .filter((specialty, index, arr) => arr.indexOf(specialty) === index);
    return specialties.sort();
  };

  const getRatingColor = (rating: number | null) => {
    if (rating === null) return "text-gray-400";
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 4.0) return "text-blue-600";
    if (rating >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  if (!user || (user as any).role !== "admin") {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-full p-4 space-y-4">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Gestion des Étudiants</h1>
            <p className="text-muted-foreground text-sm">Gérer les profils étudiants et les statuts premium</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Total Étudiants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Profils Premium</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">
                {students.filter(s => s.is_premium).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Étudiants Disponibles</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">
                {students.filter(s => s.available).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">
                {(() => {
                  const ratedStudents = students.filter(s => s.average_rating !== null);
                  if (ratedStudents.length === 0) return "N/A";
                  const avg = ratedStudents.reduce((sum, s) => sum + (s.average_rating || 0), 0) / ratedStudents.length;
                  return avg.toFixed(1);
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Liste des Étudiants</CardTitle>
            <CardDescription className="text-sm">Gérer les profils étudiants et les statuts premium</CardDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, prénom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger className="w-[150px] h-9 text-sm">
                    <SelectValue placeholder="Spécialité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les spécialités</SelectItem>
                    {getSpecialtyOptions().map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={premiumFilter} onValueChange={setPremiumFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-sm">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les statuts</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-sm">
                    <SelectValue placeholder="Disponibilité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="unavailable">Indisponible</SelectItem>
                  </SelectContent>
                </Select>

                {(searchQuery || specialtyFilter || premiumFilter || availabilityFilter) && (
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
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm min-w-[200px]">Étudiant</TableHead>
                      <TableHead className="hidden md:table-cell text-sm min-w-[150px]">Spécialité</TableHead>
                      <TableHead className="hidden sm:table-cell text-sm min-w-[100px]">Formation</TableHead>
                      <TableHead className="hidden sm:table-cell text-sm min-w-[80px]">Note Portfolio</TableHead>
                      <TableHead className="hidden sm:table-cell text-sm min-w-[80px]">Note Moyenne</TableHead>
                      <TableHead className="hidden sm:table-cell text-sm min-w-[100px]">Statut</TableHead>
                      <TableHead className="hidden sm:table-cell text-sm min-w-[100px]">Disponibilité</TableHead>
                      <TableHead className="text-sm min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(student => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold text-sm">
                                {student.name} {student.surname}
                              </div>
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                              {student.skills && student.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {student.skills.slice(0, 3).map((skill, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {student.skills.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{student.skills.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-sm">
                              {student.specialty || "Non spécifiée"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="text-sm">
                              {student.formation || "Non spécifiée"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="text-sm">
                              {student.portfolio_grade ? (
                                <span className="font-medium">{student.portfolio_grade}/20</span>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="text-sm">
                              {student.average_rating ? (
                                <span className={`font-medium ${getRatingColor(student.average_rating)}`}>
                                  {student.average_rating}/5
                                </span>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge 
                              className={student.is_premium 
                                ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white" 
                                : "bg-gray-100 text-gray-800"
                              }
                            >
                              {student.is_premium ? (
                                <div className="flex items-center gap-1">
                                  <Crown className="h-3 w-3" />
                                  Premium
                                </div>
                              ) : (
                                "Standard"
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge 
                              className={student.available 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                              }
                            >
                              {student.available ? (
                                <div className="flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" />
                                  Disponible
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <UserX className="h-3 w-3" />
                                  Indisponible
                                </div>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant={student.is_premium ? "destructive" : "default"}
                                    size="sm"
                                    className={`flex items-center text-xs h-8 ${
                                      student.is_premium 
                                        ? "bg-red-600 hover:bg-red-700" 
                                        : "bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700"
                                    }`}
                                  >
                                    {student.is_premium ? (
                                      <>
                                        <UserX className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Retirer Premium</span>
                                        <span className="sm:hidden">Retirer</span>
                                      </>
                                    ) : (
                                      <>
                                        <Crown className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Passer Premium</span>
                                        <span className="sm:hidden">Premium</span>
                                      </>
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {student.is_premium ? "Retirer le statut Premium" : "Activer le statut Premium"}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir {student.is_premium ? "retirer" : "activer"} le statut premium pour {student.name} {student.surname} ?
                                      {student.is_premium 
                                        ? " L'étudiant perdra les avantages premium."
                                        : " L'étudiant bénéficiera des avantages premium."
                                      }
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleTogglePremium(student.id, student.is_premium)}
                                      className={student.is_premium 
                                        ? "bg-red-600 hover:bg-red-700" 
                                        : "bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700"
                                      }
                                    >
                                      {student.is_premium ? "Retirer Premium" : "Activer Premium"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-sm">
                          {students.length > 0 
                            ? "Aucun étudiant ne correspond aux critères de recherche" 
                            : "Aucun étudiant trouvé"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminStudents; 