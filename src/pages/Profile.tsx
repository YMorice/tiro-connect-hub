import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";
import AppLayout from "@/components/AppLayout";
import StudentReviewsTable from "@/components/student/StudentReviewsTable";
import StudentProfileView from "@/components/profile/StudentProfileView";
import FileUpload from "@/components/FileUpload";
import { useParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Loader2 } from "lucide-react";

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { studentId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const avatarUrl = user?.pp_link || "";
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Options de spécialité correspondant à l'inscription
  const specialtyOptions = [
    { value: "ui_ux", label: "UI/UX" },
    { value: "motion_design", label: "Motion Design" },
    { value: "identite_visuelle", label: "Identité Visuelle" },
    { value: "content_creation", label: "Création de Contenu" },
  ];

  // Options de compétences correspondant à l'inscription
  const skillOptions = [
    "After Effects",
    "Illustrator", 
    "InDesign", 
    "Photoshop",
    "Premiere Pro", 
    "Adobe XD", 
    "Canva", 
    "CorelDRAW", 
    "DaVinci Resolve",
    "Figma",
    "Final Cut Pro",
    "Framer",
    "Sketch"
  ];

  // Fonction pour formater l'URL du portfolio
  const formatPortfolioUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // Si studentId est fourni dans l'URL, afficher la vue de profil d'étudiant
  useEffect(() => {
    if (studentId) {
      fetchStudentProfile();
    } else if (user) {
      fetchUserProfile();
    }
  }, [user, studentId]);

  const fetchStudentProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          users!inner(*)
        `)
        .eq('id_student', studentId)
        .single();

      if (error) throw error;

      setProfile({
        name: data.users.name,
        surname: data.users.surname,
        email: data.users.email,
        avatar: data.users.pp_link,
        bio: data.biography,
        specialty: data.specialty,
        skills: data.skills || [],
        formation: data.formation,
        portfolioLink: data.portfolio_link,
        siret: data.siret,
        iban: data.iban
      });
    } catch (error) {
      console.error("Erreur lors de la récupération du profil d'étudiant:", error);
      toast.error("Échec du chargement du profil d'étudiant");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      // Récupérer les données de base de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id_users', user.id)
        .single();

      if (userError) throw userError;

      if (userData) {
        setProfile({
          name: userData.name,
          surname: userData.surname,
          email: userData.email,
          phone: userData.phone,
          bio: '',
          specialty: '',
          skills: [],
          formation: '',
          portfolioLink: '',
          siret: '',
          iban: '',
          companyName: '',
          companyRole: '',
          companyAddress: ''
        });

        // Si l'utilisateur est un étudiant, récupérer les données supplémentaires
        if (userData.role === 'student') {
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('biography, specialty, skills, formation, portfolio_link, address, siret, iban')
            .eq('id_user', user.id)
            .maybeSingle();

          if (studentError) {
            console.error('Error fetching student data:', studentError);
          } else if (studentData) {
            console.log('Student data loaded:', studentData); // Debug log
            console.log('Skills from DB:', studentData.skills); // Debug log
            console.log('Specialty from DB:', studentData.specialty); // Debug log
            console.log('SIRET from DB:', studentData.siret); // Debug log
            console.log('IBAN from DB:', studentData.iban); // Debug log
            
            setProfile(prev => ({
              ...prev,
              bio: studentData.biography || '',
              specialty: studentData.specialty || '',
              skills: studentData.skills || [],
              formation: studentData.formation || '',
              portfolioLink: studentData.portfolio_link || '',
              address: studentData.address || '',
              siret: studentData.siret || '',
              iban: studentData.iban || ''
            }));
            
            // Charger les skills dans l'état local - S'assurer que c'est un tableau
            const skillsArray = Array.isArray(studentData.skills) ? studentData.skills : [];
            setSkills(skillsArray);
            console.log('Skills set in state:', skillsArray); // Debug log
          } else {
            console.log('No student data found, creating empty profile');
            // Si aucune donnée étudiant n'existe, initialiser avec des valeurs vides
            setProfile(prev => ({
              ...prev,
              bio: '',
              specialty: '',
              skills: [],
              formation: '',
              portfolioLink: '',
              address: '',
              siret: '',
              iban: ''
            }));
            setSkills([]);
          }
        }

        // Si l'utilisateur est un entrepreneur, récupérer les données supplémentaires
        if (userData.role === 'entrepreneur') {
          const { data: entrepreneurData, error: entrepreneurError } = await supabase
            .from('entrepreneurs')
            .select('company_name, company_role, address, company_siret')
            .eq('id_user', user.id)
            .single();

          if (entrepreneurError) {
            console.error('Error fetching entrepreneur data:', entrepreneurError);
          } else if (entrepreneurData) {
            setProfile(prev => ({
              ...prev,
              companyName: entrepreneurData.company_name || '',
              companyRole: entrepreneurData.company_role || '',
              companyAddress: entrepreneurData.address || '',
              siret: entrepreneurData.company_siret || ''
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide');
      return;
    }

    // Vérifier la taille du fichier (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    try {
      setLoading(true);

      // Supprimer l'ancienne photo si elle existe
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop()?.split('?')[0];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Uploader la nouvelle photo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl); // Debug log

      // Mettre à jour l'URL dans la base de données
      const { error: updateError } = await supabase
        .from('users')
        .update({ pp_link: publicUrl })
        .eq('id_users', user.id);

      if (updateError) throw updateError;

      // Mettre à jour l'utilisateur dans le contexte d'authentification
      await updateProfile({ pp_link: publicUrl });

      // Mettre à jour l'état local immédiatement
      toast.success('Photo de profil mise à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la photo de profil:', error);
      toast.error('Échec de la mise à jour de la photo de profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      // Mettre à jour les données utilisateur
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: profile.name,
          surname: profile.surname,
          pp_link: avatarUrl
        })
        .eq('id_users', user.id);

      if (userError) throw userError;

      // Mettre à jour les données spécifiques au rôle
      if ((user as any).role === 'student') {
        const { data: existingStudent, error: selectError } = await supabase
          .from('students')
          .select('id_student')
          .eq('id_user', user.id)
          .maybeSingle();

        if (selectError) throw selectError;

        const updateData = {
          biography: profile.bio,
          specialty: profile.specialty,
          skills: skills,
          formation: profile.formation,
          portfolio_link: formatPortfolioUrl(profile.portfolioLink),
          siret: profile.siret,
          iban: profile.iban,
          address: profile.address || "" 
        };

        if (existingStudent) {
          const { error: profileError } = await supabase
            .from('students')
            .update(updateData)
            .eq('id_user', user.id);

          if (profileError) throw profileError;
        } else {
          const { error: profileError } = await supabase
            .from('students')
            .insert({ ...updateData, id_user: user.id });

          if (profileError) throw profileError;
        }
      } else if ((user as any).role === 'entrepreneur') {
        const { data: existingEntrepreneur, error: selectError } = await supabase
          .from('entrepreneurs')
          .select('id_entrepreneur')
          .eq('id_user', user.id)
          .maybeSingle();

        if (selectError) throw selectError;

        const updateData = {
          company_name: profile.companyName,
          company_role: profile.companyRole,
          address: profile.companyAddress
        };

        if (existingEntrepreneur) {
          const { error: profileError } = await supabase
            .from('entrepreneurs')
            .update(updateData)
            .eq('id_user', user.id);

          if (profileError) throw profileError;
        } else {
          const { error: profileError } = await supabase
            .from('entrepreneurs')
            .insert({ ...updateData, id_user: user.id });

          if (profileError) throw profileError;
        }
      }

      toast.success("Profil mis à jour avec succès !");
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error("Échec de la mise à jour du profil");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si on visualise un profil d'étudiant spécifique, utiliser StudentProfileView
  if (studentId && profile) {
    return (
      <div className="min-h-screen bg-tiro-test-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <StudentProfileView 
            studentId={studentId}
            studentProfile={profile}
          />
        </div>
      </div>
    );
  }

  console.log('Profile state before render:', profile); // Debug log

  return (
    <div className="min-h-screen bg-tiro-test -50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="profile" className="w-full space-y-6">
          {(user as any).role === 'student' && (
            <TabsList className="grid w-full grid-cols-2 bg-tiro-gray1">
              <TabsTrigger
                value="profile"
                className="bg-tiro-gray1 text-gray-700 data-[state=active]:bg-tiro-white data-[state=active]:text-black transition-colors"
              >
                Profil
              </TabsTrigger>

              <TabsTrigger
                value="reviews"
                className="bg-tiro-gray1 text-gray-700 data-[state=active]:bg-tiro-white data-[state=active]:text-black transition-colors"
              >
                Avis
              </TabsTrigger>
            </TabsList>
          )}
          
          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-sm bg-tiro-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl sm:text-3xl font-clash tracking-wide">Informations du Profil</CardTitle>
                <CardDescription>
                  Mettez à jour vos informations de profil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Section Photo de Profil */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group">
                    <Avatar className="w-32 h-32">
                      {avatarUrl ? (
                        <AvatarImage 
                          src={avatarUrl}
                          alt={user?.user_metadata?.name || "Photo de profil"}
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback className="text-2xl bg-primary text-white">
                          {user?.user_metadata?.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                    >
                      <Camera className="w-8 h-8 text-white" />
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={loading}
                    />
                  </div>
                  {loading && (
                    <div className="mt-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>

                {/* Informations de Base */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="name">Prénom</Label>
                    <Input
                      id="name"
                      value={profile.name || user?.user_metadata?.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="bg-tiro-white"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label htmlFor="surname">Nom</Label>
                    <Input
                      id="surname"
                      value={profile.surname || user?.user_metadata?.surname}
                      onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                      className="bg-tiro-white"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile.email || user?.email}
                    disabled
                    className="bg-tiro-white"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || user?.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="bg-tiro-white"
                  />
                </div>

                {/* Champs spécifiques au rôle */}
                {(user as any).role === 'student' && (
                  <>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio || ""}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        className="min-h-[100px] bg-tiro-white"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <Label>Spécialités</Label>
                      <div className="flex flex-col space-y-2">
                        {specialtyOptions.map((specialty) => {
                          // Parse les spécialités existantes
                          let currentSpecialties: string[] = [];
                          if (Array.isArray(profile.specialty)) {
                            currentSpecialties = profile.specialty;
                          } else if (typeof profile.specialty === 'string' && profile.specialty) {
                            try {
                              currentSpecialties = JSON.parse(profile.specialty);
                            } catch {
                              currentSpecialties = [profile.specialty];
                            }
                          }
                          
                          return (
                            <div key={specialty.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`specialty-${specialty.value}`}
                                checked={currentSpecialties.includes(specialty.value)}
                                onCheckedChange={(checked) => {
                                  let newSpecialties: string[];
                                  if (checked) {
                                    newSpecialties = [...currentSpecialties, specialty.value];
                                  } else {
                                    newSpecialties = currentSpecialties.filter(s => s !== specialty.value);
                                  }
                                  setProfile({
                                    ...profile,
                                    specialty: JSON.stringify(newSpecialties)
                                  });
                                }}
                              />
                              <Label
                                htmlFor={`specialty-${specialty.value}`}
                                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {specialty.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <Label htmlFor="formation">Formation</Label>
                      <Input
                        id="formation"
                        value={profile.formation || ""}
                        onChange={(e) => setProfile({ ...profile, formation: e.target.value })}
                        className="bg-tiro-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portfolioLink">Lien Portfolio</Label>
                      <Input
                        id="portfolioLink"
                        value={profile.portfolioLink || ""}
                        onChange={(e) => setProfile({ ...profile, portfolioLink: e.target.value })}
                        placeholder="votre-portfolio.com"
                        className="w-full bg-tiro-white"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <Label htmlFor="siret">Numéro SIRET</Label>
                      <Input
                        id="siret"
                        value={profile.siret || ""}
                        onChange={(e) => setProfile({ ...profile, siret: e.target.value })}
                        placeholder="Votre numéro SIRET"
                        className="bg-tiro-white"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <Label htmlFor="iban">IBAN</Label>
                      <Input
                        id="iban"
                        value={profile.iban || ""}
                        onChange={(e) => setProfile({ ...profile, iban: e.target.value })}
                        placeholder="Votre IBAN"
                        className="bg-tiro-white"
                      />
                    </div>

                    {/* Champ Adresse */}
                    <div className="space-y-2 text-left">
                      <Label htmlFor="address">Adresse</Label>
                      <Textarea
                        id="address"
                        value={profile.address || ""}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className="min-h-[100px] bg-tiro-white"
                      />
                    </div>

                    {/* Section Compétences */}
                    <div className="space-y-4">
                      <Label>Compétences</Label>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-sm flex items-center gap-2">
                              {skill}
                              <button
                                type="button"
                                onClick={() => removeSkill(skill)}
                                className="ml-1 hover:text-red-500 text-lg"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Select value={newSkill} onValueChange={setNewSkill}>
                            <SelectTrigger className="flex-1 bg-tiro-white">
                              <SelectValue placeholder="Sélectionner une compétence à ajouter" />
                            </SelectTrigger>
                            <SelectContent>
                              {skillOptions
                                .filter(skill => !skills.includes(skill))
                                .map((skill) => (
                                  <SelectItem key={skill} value={skill}>
                                    {skill}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" onClick={addSkill} disabled={!newSkill} className="sm:w-auto w-full">
                            Ajouter Compétence
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {(user as any).role === 'entrepreneur' && (
                  <>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="companyName">Nom de l'entreprise</Label>
                      <Input
                        id="companyName"
                        value={profile.companyName || ""}
                        onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                        className="bg-tiro-white"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <Label htmlFor="companyRole">Votre rôle dans l'entreprise</Label>
                      <Input
                        id="companyRole"
                        value={profile.companyRole || ""}
                        onChange={(e) => setProfile({ ...profile, companyRole: e.target.value })}
                        className="bg-tiro-white"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <Label htmlFor="siret">Numéro SIRET</Label>
                      <Input
                        id="siret"
                        value={profile.siret || ""}
                        onChange={(e) => setProfile({ ...profile, siret: e.target.value })}
                        placeholder="Votre numéro SIRET"
                        className="bg-tiro-white"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <Label htmlFor="companyAddress">Adresse de l'entreprise</Label>
                      <Textarea
                        id="companyAddress"
                        value={profile.companyAddress || ""}
                        onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })}
                        className="min-h-[100px] bg-tiro-white"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-center pt-6">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full sm:w-auto px-8 py-3"
                  >
                    {saving ? (
                      <div className="flex items-center">
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                        Sauvegarde...
                      </div>
                    ) : "Sauvegarder le Profil"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(user as any).role === 'student' && (
            <TabsContent value="reviews">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Vos Avis</CardTitle>
                  <CardDescription>
                    Ici vous pouvez voir tous les avis que vous avez reçus.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StudentReviewsTable />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
