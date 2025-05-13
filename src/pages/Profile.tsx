
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/sonner";
import { useForm } from "react-hook-form";
import { User } from "@/types";

const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsText, setSkillsText] = useState("");

  const form = useForm({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      bio: user?.bio || "",
    },
  });

  useEffect(() => {
    if (user?.skills) {
      setSkills(user.skills);
      setSkillsText(user.skills.join(", "));
    }
  }, [user]);

  const handleSaveProfile = (data: { name: string; email: string; bio: string }) => {
    if (!user) return;

    const updatedUser: Partial<User> = {
      ...data,
      skills,
    };

    updateProfile(updatedUser);
    setIsEditing(false);
    toast.success("Profile updated successfully");
  };

  const handleAddSkill = () => {
    if (skillsText) {
      // Check if skillsText is a string before using split
      const skillsArray = typeof skillsText === 'string' 
        ? skillsText.split(",").map((skill) => skill.trim()).filter(Boolean)
        : [];
      setSkills(skillsArray);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Profile</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>
              Manage your personal information and how it is displayed to others
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSaveProfile)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma separated)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="skills"
                        value={skillsText}
                        onChange={(e) => setSkillsText(e.target.value)}
                        placeholder="React, TypeScript, UI Design"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddSkill}
                      >
                        Update
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill, index) => (
                        <div
                          key={index}
                          className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                        >
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Full Name
                  </h3>
                  <p className="mt-1">{user.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Email
                  </h3>
                  <p className="mt-1">{user.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Bio
                  </h3>
                  <p className="mt-1">{user.bio || "No bio provided"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {skills.length > 0 ? (
                      skills.map((skill, index) => (
                        <div
                          key={index}
                          className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                        >
                          {skill}
                        </div>
                      ))
                    ) : (
                      <p>No skills added</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
