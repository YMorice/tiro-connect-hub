
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

const Profile = () => {
  const { user } = useAuth();
  const { studentId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Specialty options matching signup
  const specialtyOptions = [
    "Web Development",
    "Mobile Development", 
    "Data Science",
    "AI/Machine Learning",
    "Cybersecurity",
    "Cloud Computing",
    "DevOps",
    "UI/UX Design",
    "Digital Marketing",
    "Project Management"
  ];

  // Skills options matching signup
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

  // If studentId is provided in URL, show student profile view
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
      console.error("Error fetching student profile:", error);
      toast.error("Failed to load student profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id_users', user.id)
        .single();

      if (userError) throw userError;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id_user', user.id)
        .single();

      if (studentError && studentError.code !== 'PGRST116') throw studentError;

      const { data: entrepreneurData, error: entrepreneurError } = await supabase
        .from('entrepreneurs')
        .select('*')
        .eq('id_user', user.id)
        .single();

      if (entrepreneurError && entrepreneurError.code !== 'PGRST116') throw entrepreneurError;

      setProfile({
        name: userData.name,
        surname: userData.surname,
        email: userData.email,
        avatar: userData.pp_link || "",
        bio: studentData?.biography || "",
        specialty: studentData?.specialty || "",
        skills: studentData?.skills || [],
        formation: studentData?.formation || "",
        portfolioLink: studentData?.portfolio_link || "",
        companyName: entrepreneurData?.company_name || "",
        companyRole: entrepreneurData?.company_role || "",
        companyAddress: entrepreneurData?.address || ""
      });
      setSkills(studentData?.skills || []);
      setAvatarUrl(userData.pp_link || "");
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pp')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('pp')
        .getPublicUrl(filePath);
        
      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(newAvatarUrl);
      toast.success("Profile picture uploaded successfully");
      
    } catch (error: any) {
      console.error("Error uploading profile picture:", error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      // Update user data
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: profile.name,
          surname: profile.surname,
          pp_link: avatarUrl
        })
        .eq('id_users', user.id);

      if (userError) throw userError;

      // Update role-specific data
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
          portfolio_link: profile.portfolioLink
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

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
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

  // If viewing a specific student profile, use StudentProfileView
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              {(user as any).role === 'student' && (
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="profile" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Profile Information</CardTitle>
                  <CardDescription>
                    Update your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Profile Picture Section */}
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-32 w-32">
                      {avatarUrl ? (
                        <AvatarImage 
                          src={avatarUrl} 
                          alt={`${profile.name} ${profile.surname}`}
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback className="text-2xl bg-primary text-white">
                          {profile.name?.charAt(0)}{profile.surname?.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <FileUpload 
                      onFileSelect={handleAvatarUpload} 
                      accept="image/*"
                      buttonText={isUploadingAvatar ? "Uploading..." : "Change Profile Picture"}
                    />
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">First Name</Label>
                      <Input
                        id="name"
                        value={profile.name || ""}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surname">Last Name</Label>
                      <Input
                        id="surname"
                        value={profile.surname || ""}
                        onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email || ""}
                      disabled
                      className="bg-gray-100 w-full"
                    />
                  </div>

                  {/* Role-specific fields */}
                  {(user as any).role === 'student' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={profile.bio || ""}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          placeholder="Tell us about yourself..."
                          className="min-h-[100px] w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specialty">Specialty</Label>
                        <Select value={profile.specialty || ""} onValueChange={(value) => setProfile({ ...profile, specialty: value })}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select your specialty" />
                          </SelectTrigger>
                          <SelectContent>
                            {specialtyOptions.map((specialty) => (
                              <SelectItem key={specialty} value={specialty}>
                                {specialty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="formation">Education</Label>
                        <Input
                          id="formation"
                          value={profile.formation || ""}
                          onChange={(e) => setProfile({ ...profile, formation: e.target.value })}
                          placeholder="Your educational background"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="portfolioLink">Portfolio Link</Label>
                        <Input
                          id="portfolioLink"
                          value={profile.portfolioLink || ""}
                          onChange={(e) => setProfile({ ...profile, portfolioLink: e.target.value })}
                          placeholder="https://your-portfolio.com"
                          className="w-full"
                        />
                      </div>

                      {/* Skills Section */}
                      <div className="space-y-4">
                        <Label>Skills</Label>
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
                                <SelectValue placeholder="Select a skill to add" />
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
                              Add Skill
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {(user as any).role === 'entrepreneur' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          value={profile.companyName || ""}
                          onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                          placeholder="Your company name"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyRole">Role in Company</Label>
                        <Input
                          id="companyRole"
                          value={profile.companyRole || ""}
                          onChange={(e) => setProfile({ ...profile, companyRole: e.target.value })}
                          placeholder="Your role/position"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyAddress">Company Address</Label>
                        <Textarea
                          id="companyAddress"
                          value={profile.companyAddress || ""}
                          onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })}
                          placeholder="Company address"
                          className="min-h-[100px] w-full"
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
                          Saving...
                        </div>
                      ) : "Save Profile"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {(user as any).role === 'student' && (
              <TabsContent value="reviews">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Your Reviews</CardTitle>
                    <CardDescription>
                      Here you can see all the reviews you have received.
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
