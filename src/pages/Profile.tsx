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
import { supabase } from "@/integrations/supabase/client";

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
  const [profileData, setProfileData] = useState<any>(null);

  const form = useForm({
    defaultValues: {
      name: user?.name || "",
      surname: "",
      email: user?.email || "",
      phone: "",
      bio: user?.bio || "",
      // Student specific fields
      specialty: "",
      portfolioLink: "",
      address: "",
      formation: "",
      siret: "",
      iban: "",
      // Entrepreneur specific fields
      companyName: "",
      companyRole: "",
      companyAddress: "",
      companySiret: ""
    },
  });

  // Safely get user initials
  const getUserInitials = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Fetch user's extended profile data from the database
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || !session) return;
      
      setIsLoading(true);
      try {
        if (user.role === 'student') {
          const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('id_user', user.id)
            .single();
            
          if (error) throw error;
          
          if (data) {
            setProfileData(data);
            setSelectedSkills(data.skills || []);
            
            form.reset({
              name: user.name,
              surname: "", // Will be updated when users table data arrives
              email: user.email,
              phone: "",
              bio: data.biography || "",
              specialty: data.specialty || "",
              portfolioLink: data.portfolio_link || "",
              address: data.address || "",
              formation: data.formation || "",
              siret: data.siret || "",
              iban: data.iban || "",
            });
          }
        } else if (user.role === 'entrepreneur') {
          const { data, error } = await supabase
            .from('entrepreneurs')
            .select('*')
            .eq('id_user', user.id)
            .single();
            
          if (error) throw error;
          
          if (data) {
            setProfileData(data);
            
            form.reset({
              name: user.name,
              surname: "", // Will be updated when users table data arrives
              email: user.email,
              phone: "",
              bio: user.bio || "",
              companyName: data.company_name || "",
              companyRole: data.company_role || "",
              companyAddress: data.address || "",
              companySiret: data.company_siret || "",
            });
          }
        }
        
        // Fetch common user data from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id_users', user.id)
          .single();
          
        if (userError) throw userError;
        
        if (userData) {
          form.setValue('surname', userData.surname || "");
          form.setValue('phone', userData.phone || "");
          
          // Set avatar URL with cache busting
          if (userData.pp_link) {
            setAvatarUrl(`${userData.pp_link}?t=${Date.now()}`);
          }
        }
        
      } catch (error) {
        console.error("Error fetching profile data:", error);
        toast.error("Failed to fetch profile data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, [user, form, session]);

  useEffect(() => {
    if (user?.skills) {
      setSelectedSkills(user.skills);
    }
    if (user?.avatar) {
      setAvatarUrl(`${user.avatar}?t=${Date.now()}`);
    }
  }, [user]);

  // Check for session and redirect if not available
  useEffect(() => {
    if (!session) {
      console.log("No session detected in Profile page, redirecting to login");
      navigate("/login");
    }
  }, [session, navigate]);

  const handleSaveProfile = async (formData: any) => {
    if (!user || !session) {
      toast.error("No active session found. Please log in again.");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    
    try {
      console.log("Submitting profile update with data:", formData);
      
      // Update common user data in users table
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          surname: formData.surname,
          phone: formData.phone,
          pp_link: avatarUrl?.split('?')[0] // Remove cache busting parameter
        })
        .eq('id_users', user.id);
        
      if (userUpdateError) throw userUpdateError;
      
      // Update role-specific data
      if (user.role === 'student') {
        const { error: studentError } = await supabase
          .from('students')
          .update({
            biography: formData.bio,
            specialty: formData.specialty,
            portfolio_link: formData.portfolioLink,
            address: formData.address,
            formation: formData.formation,
            siret: formData.siret,
            iban: formData.iban,
            skills: selectedSkills,
          })
          .eq('id_user', user.id);
          
        if (studentError) throw studentError;
      } else if (user.role === 'entrepreneur') {
        const { error: entrepreneurError } = await supabase
          .from('entrepreneurs')
          .update({
            company_name: formData.companyName,
            company_role: formData.companyRole,
            address: formData.companyAddress,
            company_siret: formData.companySiret,
          })
          .eq('id_user', user.id);
          
        if (entrepreneurError) throw entrepreneurError;
      }
      
      // Update user metadata via auth context
      const updatedUser: Partial<User> = {
        name: formData.name,
        email: formData.email,
        bio: user.role === 'student' ? formData.bio : undefined,
        skills: user.role === 'student' ? selectedSkills : undefined,
        avatar: avatarUrl,
      };

      await updateProfile(updatedUser);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(`Failed to update profile: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!user || !session) {
      toast.error("No active session found");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload the file to Supabase Storage "pp" bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload the file
      const { error: uploadError } = await supabase
        .storage
        .from('pp')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from('pp')
        .getPublicUrl(filePath);
        
      const avatarUrlFromStorage = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(avatarUrlFromStorage);
      
      // Update the pp_link in the users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ pp_link: urlData.publicUrl })
        .eq('id_users', user.id);
        
      if (updateError) throw updateError;
      
      toast.success("Profile picture uploaded");
      
    } catch (error: any) {
      console.error("Error uploading profile picture:", error);
      toast.error(`Failed to upload profile picture: ${error.message || "Unknown error"}`);
      // Create a temporary URL for the selected image as fallback
      const tempUrl = URL.createObjectURL(file);
      setAvatarUrl(tempUrl);
    } finally {
      setIsLoading(false);
    }
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
            {isLoading && !isEditing ? (
              <div className="py-8 text-center">Loading your profile data...</div>
            ) : isEditing ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSaveProfile)}
                  className="space-y-4"
                >
                  {/* Avatar upload section */}
                  <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-start mb-4">
                    <Avatar className="w-24 h-24">
                      {avatarUrl ? (
                        <AvatarImage 
                          src={avatarUrl} 
                          alt={user?.name || "User"} 
                          className="object-cover"
                          onError={(e) => {
                            console.error("Failed to load avatar image:", avatarUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <AvatarFallback className="bg-tiro-primary text-white text-xl">
                          {getUserInitials()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <FileUpload 
                      onFileSelect={handleFileSelect} 
                      accept="image/*"
                      buttonText="Upload Profile Picture"
                    />
                  </div>

                  {/* Common fields for all users */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="surname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" {...field} disabled />
                          </FormControl>
                          <FormDescription>
                            Email address cannot be changed
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 000-0000" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Role-specific fields */}
                  {user.role === "student" ? (
                    <>
                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biography</FormLabel>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="specialty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specialty</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Web Developer" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="portfolioLink"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Portfolio Link</FormLabel>
                              <FormControl>
                                <Input placeholder="https://yourportfolio.com" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Your address" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="formation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Education</FormLabel>
                            <FormControl>
                              <Input placeholder="Your education/formation" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="siret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SIRET Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Your SIRET number" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="iban"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IBAN</FormLabel>
                              <FormControl>
                                <Input placeholder="Your IBAN" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

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
                    </>
                  ) : user.role === "entrepreneur" ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your company name" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="companyRole"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Role in Company</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. CEO, Founder" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="companyAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Company address" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="companySiret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company SIRET</FormLabel>
                            <FormControl>
                              <Input placeholder="Company SIRET number" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  ) : null}

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
              <div className="space-y-6">
                <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-start mb-4">
                  <Avatar className="w-24 h-24">
                    {avatarUrl ? (
                      <AvatarImage 
                        src={avatarUrl} 
                        alt={user?.name || "User"} 
                        className="object-cover"
                        onError={(e) => {
                          console.error("Failed to load avatar image:", avatarUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <AvatarFallback className="bg-tiro-primary text-white text-xl">
                        {getUserInitials()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </h3>
                    <p className="mt-1">{form.getValues().name} {form.getValues().surname}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Email
                    </h3>
                    <p className="mt-1">{form.getValues().email}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Phone
                    </h3>
                    <p className="mt-1">{form.getValues().phone || "Not provided"}</p>
                  </div>
                  
                  {user.role === "student" ? (
                    <>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Specialty
                        </h3>
                        <p className="mt-1">{form.getValues().specialty || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Portfolio
                        </h3>
                        <p className="mt-1">
                          {form.getValues().portfolioLink ? (
                            <a 
                              href={form.getValues().portfolioLink} 
                              className="text-primary hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {form.getValues().portfolioLink}
                            </a>
                          ) : (
                            "Not provided"
                          )}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Education
                        </h3>
                        <p className="mt-1">{form.getValues().formation || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Address
                        </h3>
                        <p className="mt-1">{form.getValues().address || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          SIRET
                        </h3>
                        <p className="mt-1">{form.getValues().siret || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          IBAN
                        </h3>
                        <p className="mt-1">{form.getValues().iban || "Not provided"}</p>
                      </div>
                      
                      <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Biography
                        </h3>
                        <p className="mt-1">{form.getValues().bio || "No biography provided"}</p>
                      </div>
                      
                      <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Skills
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
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
                    </>
                  ) : user.role === "entrepreneur" ? (
                    <>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Company Name
                        </h3>
                        <p className="mt-1">{form.getValues().companyName || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Your Role
                        </h3>
                        <p className="mt-1">{form.getValues().companyRole || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Company Address
                        </h3>
                        <p className="mt-1">{form.getValues().companyAddress || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Company SIRET
                        </h3>
                        <p className="mt-1">{form.getValues().companySiret || "Not provided"}</p>
                      </div>
                    </>
                  ) : null}
                </div>
                
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
