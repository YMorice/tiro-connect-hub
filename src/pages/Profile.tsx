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
import { Checkbox } from "@/components/ui/checkbox";
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
import FileUpload from "@/components/FileUpload";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Predefined list of skills for checkboxes
const AVAILABLE_SKILLS = [
  "UI/UX Design", 
  "Figma",
  "Adobe XD", 
  "HTML", 
  "CSS",
  "JavaScript", 
  "React", 
  "Vue.js", 
  "TypeScript", 
  "Node.js",
  "Python",
  "Django",
  "Ruby on Rails",
  "PHP",
  "WordPress",
  "Mobile Development",
  "React Native",
  "iOS Development",
  "Android Development",
  "UX Research",
  "SEO",
  "Digital Marketing"
];

const Profile = () => {
  const { user, updateProfile, logout, session } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      bio: user?.bio || "",
    },
  });

  useEffect(() => {
    if (user?.skills) {
      setSelectedSkills(user.skills);
    }
    if (user?.avatar) {
      setAvatarUrl(user.avatar);
    }

    // Reset form values when user data changes
    form.reset({
      name: user?.name || "",
      email: user?.email || "",
      bio: user?.bio || "",
    });
  }, [user, form]);

  // Check for session and redirect if not available
  useEffect(() => {
    if (!session) {
      console.log("No session detected in Profile page, redirecting to login");
      navigate("/login");
    }
  }, [session, navigate]);

  const handleSaveProfile = async (data: { name: string; email: string; bio: string }) => {
    if (!user || !session) {
      toast.error("No active session found. Please log in again.");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    
    try {
      const updatedUser: Partial<User> = {
        ...data,
        skills: user.role === "student" ? selectedSkills : undefined,
        avatar: avatarUrl,
      };

      await updateProfile(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    // Create a temporary URL for the selected image
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    toast.success("Profile picture selected");
  };

  const handleLogout = async () => {
    if (!session) {
      toast.error("No active session found");
      navigate("/login");
      return;
    }
    
    setIsLoading(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skill toggle for checkbox selection
  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(current => 
      current.includes(skill)
        ? current.filter(s => s !== skill)
        : [...current, skill]
    );
  };

  if (!user || !session) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Session expired</h1>
            <p className="mb-4">Your session has expired or you are not logged in.</p>
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Profile</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Logout"}
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
                  {/* Avatar upload section */}
                  <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-start mb-4">
                    <Avatar className="w-24 h-24">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={user.name} />
                      ) : (
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <FileUpload 
                      onFileSelect={handleFileSelect} 
                      accept="image/*"
                      buttonText="Upload Profile Picture"
                    />
                  </div>

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

                  {/* Display skills section only for students */}
                  {user.role === "student" && (
                    <div className="space-y-2">
                      <Label>Skills</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                        {AVAILABLE_SKILLS.map((skill) => (
                          <div key={skill} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`skill-${skill}`} 
                              checked={selectedSkills.includes(skill)}
                              onCheckedChange={() => handleSkillToggle(skill)}
                            />
                            <label 
                              htmlFor={`skill-${skill}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {skill}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-start mb-4">
                  <Avatar className="w-24 h-24">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={user.name} />
                    ) : (
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>
                </div>
                
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
                {user.role === "student" && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedSkills.length > 0 ? (
                        selectedSkills.map((skill, index) => (
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
                )}
                <div className="flex justify-end">
                  <Button 
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                  >
                    Edit Profile
                  </Button>
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
