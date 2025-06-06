
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
import ProfilePictureStep from "@/components/register/ProfilePictureStep";
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

  // Predefined options
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

  const skillOptions = [
    "JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Node.js",
    "Python", "Java", "C#", "PHP", "Ruby", "Go", "Rust",
    "HTML", "CSS", "SASS", "Tailwind CSS", "Bootstrap",
    "MongoDB", "PostgreSQL", "MySQL", "Firebase", "Supabase",
    "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes",
    "Git", "GitHub", "GitLab", "Figma", "Adobe Creative Suite"
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
        <div className="container max-w-4xl py-4 px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If viewing a specific student profile, use StudentProfileView
  if (studentId && profile) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-4 px-4">
          <StudentProfileView 
            studentId={studentId}
            studentProfile={profile}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-4 px-4">
        <Tabs defaultValue="profile" className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {(user as any).role === 'student' && (
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={`${profile.name} ${profile.surname}`} />
                    ) : (
                      <AvatarFallback className="text-lg">
                        {profile.name?.charAt(0)}{profile.surname?.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <ProfilePictureStep
                    form={null as any}
                    avatarUrl={avatarUrl}
                    setAvatarUrl={setAvatarUrl}
                    formData={profile}
                  />
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">First Name</Label>
                    <Input
                      id="name"
                      value={profile.name || ""}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="surname">Last Name</Label>
                    <Input
                      id="surname"
                      value={profile.surname || ""}
                      onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile.email || ""}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                {/* Role-specific fields */}
                {(user as any).role === 'student' && (
                  <>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio || ""}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="specialty">Specialty</Label>
                      <Select value={profile.specialty || ""} onValueChange={(value) => setProfile({ ...profile, specialty: value })}>
                        <SelectTrigger>
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

                    <div>
                      <Label htmlFor="formation">Education</Label>
                      <Input
                        id="formation"
                        value={profile.formation || ""}
                        onChange={(e) => setProfile({ ...profile, formation: e.target.value })}
                        placeholder="Your educational background"
                      />
                    </div>

                    <div>
                      <Label htmlFor="portfolioLink">Portfolio Link</Label>
                      <Input
                        id="portfolioLink"
                        value={profile.portfolioLink || ""}
                        onChange={(e) => setProfile({ ...profile, portfolioLink: e.target.value })}
                        placeholder="https://your-portfolio.com"
                      />
                    </div>

                    {/* Skills Section */}
                    <div>
                      <Label>Skills</Label>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs flex items-center gap-1">
                              {skill}
                              <button
                                type="button"
                                onClick={() => removeSkill(skill)}
                                className="ml-1 hover:text-red-500"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
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
                          <Button type="button" onClick={addSkill} disabled={!newSkill}>
                            Add Skill
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {(user as any).role === 'entrepreneur' && (
                  <>
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={profile.companyName || ""}
                        onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                        placeholder="Your company name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="companyRole">Role in Company</Label>
                      <Input
                        id="companyRole"
                        value={profile.companyRole || ""}
                        onChange={(e) => setProfile({ ...profile, companyRole: e.target.value })}
                        placeholder="Your role/position"
                      />
                    </div>

                    <div>
                      <Label htmlFor="companyAddress">Company Address</Label>
                      <Textarea
                        id="companyAddress"
                        value={profile.companyAddress || ""}
                        onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })}
                        placeholder="Company address"
                      />
                    </div>
                  </>
                )}

                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                      Saving...
                    </div>
                  ) : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {(user as any).role === 'student' && (
            <TabsContent value="reviews">
              <Card>
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
    </AppLayout>
  );
};

export default Profile;
