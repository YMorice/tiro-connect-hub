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
  const { user } = useAuth();
  const { studentId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const avatarUrl = user?.user_metadata?.avatar || "";
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Options de spécialité correspondant à l'inscription
  const specialtyOptions = [
    "UI/UX",
    "Motion Design",
    "Identité Visuelle",
    "Création de contenu"
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
        portfolioLink: data.portfolio_link
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
          portfolioLink: ''
        });

        // Si l'utilisateur est un étudiant, récupérer les données supplémentaires
        if (userData.role === 'student') {
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('biography, specialty, skills, formation, portfolio_link')
            .eq('id_user', user.id)
            .single();

          if (studentError) {
            console.error('Error fetching student data:', studentError);
          } else if (studentData) {
            setProfile(prev => ({
              ...prev,
              bio: studentData.biography || '',
              specialty: studentData.specialty || '',
              skills: studentData.skills || [],
              formation: studentData.formation || '',
              portfolioLink: studentData.portfolio_link || ''
            }));
          }
        }

        // Définir l'URL de l'avatar
        if (userData.pp_link) {
          setAvatarUrl(userData.pp_link);
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
          portfolio_link: formatPortfolioUrl(profile.portfolioLink)
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
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  // Si on visualise un profil d'étudiant spécifique, utiliser StudentProfileView
  if (studentId && profile) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <StudentProfileView 
              studentId={studentId}
              studentProfile={profile}
            />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="profile" className="w-full space-y-6">
            <TabsList className={`grid w-full ${(user as any).role === 'student' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="profile">Profil</TabsTrigger>
              {(user as any).role === 'student' && (
                <TabsTrigger value="reviews">Avis</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="profile" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Informations du Profil</CardTitle>
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
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="surname">Nom</Label>
                      <Input
                        id="surname"
                        value={profile.surname}
                        onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                    />
                  </div>

                  {/* Champs spécifiques au rôle */}
                  {(user as any).role === 'student' && (
                    <>
                      <div className="space-y-2 text-left">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={profile.bio}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2 text-left">
                        <Label>Spécialités</Label>
                        <div className="flex flex-col space-y-2">
                          {specialtyOptions.map((specialty) => (
                            <div key={specialty} className="flex items-center space-x-2">
                              <Checkbox
                                id={`specialty-${specialty}`}
                                checked={profile.specialty?.includes(specialty)}
                                onCheckedChange={(checked) => {
                                  const currentSpecialties = profile.specialty || [];
                                  setProfile({
                                    ...profile,
                                    specialty: checked
                                      ? [...currentSpecialties, specialty]
                                      : currentSpecialties.filter(s => s !== specialty)
                                  });
                                }}
                              />
                              <Label
                                htmlFor={`specialty-${specialty}`}
                                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {specialty}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 text-left">
                        <Label htmlFor="formation">Formation</Label>
                        <Input
                          id="formation"
                          value={profile.formation}
                          onChange={(e) => setProfile({ ...profile, formation: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="portfolioLink">Lien Portfolio</Label>
                        <Input
                          id="portfolioLink"
                          value={profile.portfolioLink || ""}
                          onChange={(e) => setProfile({ ...profile, portfolioLink: e.target.value })}
                          placeholder="votre-portfolio.com"
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Entrez l'URL avec ou sans http:// ou https://
                        </p>
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
                              <SelectTrigger className="flex-1">
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
                          value={profile.companyName}
                          onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2 text-left">
                        <Label htmlFor="companyRole">Votre rôle dans l'entreprise</Label>
                        <Input
                          id="companyRole"
                          value={profile.companyRole}
                          onChange={(e) => setProfile({ ...profile, companyRole: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2 text-left">
                        <Label htmlFor="companyAddress">Adresse de l'entreprise</Label>
                        <Textarea
                          id="companyAddress"
                          value={profile.companyAddress}
                          onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })}
                          className="min-h-[100px]"
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
    </AppLayout>
  );
};

export default Profile;
