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
import { useParams } from "react-router-dom";

const Profile = () => {
  const { user } = useAuth();
  const { studentId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        avatar: userData.pp_link,
        bio: studentData?.biography || entrepreneurData?.biography || "",
        specialty: studentData?.specialty || entrepreneurData?.specialty || "",
        skills: studentData?.skills || entrepreneurData?.skills || [],
        formation: studentData?.formation || "",
        portfolioLink: studentData?.portfolio_link || "",
        linkedinLink: entrepreneurData?.linkedin_link || "",
        githubLink: entrepreneurData?.github_link || ""
      });
      setSkills(studentData?.skills || entrepreneurData?.skills || []);
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
          pp_link: profile.avatar
        })
        .eq('id_users', user.id);

      if (userError) throw userError;

      // Determine if the user is a student or entrepreneur and update accordingly
      let tableName = '';
      let updateData: any = {
        biography: profile.bio,
        skills: skills
      };

      if ((user as any).role === 'student') {
        tableName = 'students';
        updateData.formation = profile.formation;
        updateData.portfolio_link = profile.portfolioLink;
      } else if ((user as any).role === 'entrepreneur') {
        tableName = 'entrepreneurs';
        updateData.specialty = profile.specialty;
        updateData.linkedin_link = profile.linkedinLink;
        updateData.github_link = profile.githubLink;
      }

      const { data: existingRecord, error: selectError } = await supabase
        .from(tableName)
        .select('id')
        .eq('id_user', user.id)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existingRecord) {
        // Update existing record
        const { error: profileError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id_user', user.id);

        if (profileError) throw profileError;
      } else {
        // Insert new record
        updateData.id_user = user.id;
        const { error: profileError } = await supabase
          .from(tableName)
          .insert(updateData);

        if (profileError) throw profileError;
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
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {(user as any).role === 'student' && (
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="surname">Surname</Label>
                    <Input
                      id="surname"
                      value={profile.surname}
                      onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="avatar">Avatar URL</Label>
                    <Input
                      id="avatar"
                      value={profile.avatar}
                      onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    />
                  </div>
                  {(user as any).role === 'student' && (
                    <>
                      <div>
                        <Label htmlFor="specialty">Specialty</Label>
                        <Input
                          id="specialty"
                          value={profile.specialty}
                          onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="formation">Formation</Label>
                        <Input
                          id="formation"
                          value={profile.formation}
                          onChange={(e) => setProfile({ ...profile, formation: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="portfolioLink">Portfolio Link</Label>
                        <Input
                          id="portfolioLink"
                          value={profile.portfolioLink}
                          onChange={(e) => setProfile({ ...profile, portfolioLink: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  {(user as any).role === 'entrepreneur' && (
                    <>
                      <div>
                        <Label htmlFor="specialty">Specialty</Label>
                        <Input
                          id="specialty"
                          value={profile.specialty}
                          onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="linkedinLink">LinkedIn Link</Label>
                        <Input
                          id="linkedinLink"
                          value={profile.linkedinLink}
                          onChange={(e) => setProfile({ ...profile, linkedinLink: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="githubLink">GitHub Link</Label>
                        <Input
                          id="githubLink"
                          value={profile.githubLink}
                          onChange={(e) => setProfile({ ...profile, githubLink: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Skills</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="text"
                        placeholder="Add a skill"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                      />
                      <Button type="button" onClick={addSkill}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-1 -mr-1 h-4 w-4"
                            onClick={() => removeSkill(skill)}
                          >
                            <span className="sr-only">Remove</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
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
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;
