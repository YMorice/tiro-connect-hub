import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/context/auth-context";
import { UserRole } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import FileUpload from "@/components/FileUpload";
import { supabase } from "@/integrations/supabase/client";

// List of available skills for checkboxes
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

// Step 1 schema - Basic registration information
const step1Schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "entrepreneur"] as const),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Use",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Step 2 schema - Role-specific information (part 1)
const step2SchemaStudent = z.object({
  specialty: z.string().min(1, "Please select a specialty"),
  bio: z.string().min(10, "Please provide at least 10 characters about yourself"),
  // Modified to accept any URL without requiring https:// prefix and making it required
  portfolioUrl: z.string().min(1, "Portfolio URL is required"),
  formation: z.string().min(1, "Please provide your education or training information"),
});

const step2SchemaEntrepreneur = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phoneNumber: z.string().min(10, "Please enter a valid phone number"),
});

// Step 3 schema - Role-specific information (part 2)
const step3SchemaStudent = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phoneNumber: z.string().min(10, "Please enter a valid phone number"),
});

const step3SchemaEntrepreneur = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyRole: z.string().min(2, "Your role must be at least 2 characters"),
  siret: z.string().min(14, "SIRET number must be at least 14 characters"),
  companyAddress: z.string().min(5, "Please enter a valid address"),
});

// Step 4 schema - Additional information
const step4SchemaStudent = z.object({
  siret: z.string().optional(),
  address: z.string().min(5, "Please enter a valid address"),
  iban: z.string().min(15, "Please enter a valid IBAN"),
});

// Combined type for all form values
type FormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  role: "student" | "entrepreneur";
  acceptTerms: boolean;
  specialty?: string;
  bio?: string;
  portfolioUrl?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  companyName?: string;
  companyRole?: string;
  siret?: string;
  companyAddress?: string;
  isFreelance?: boolean;
  address?: string;
  iban?: string;
  skills?: string[];
  avatar?: string;
  skipProject?: boolean;
  formation?: string; // Add formation field
};

const Register = () => {
  const { register: authRegister, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [registrationCompleted, setRegistrationCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  const [formValues, setFormValues] = useState<FormValues>({
    email: "",
    password: "",
    confirmPassword: "",
    role: "entrepreneur",
    acceptTerms: false,
  });
  
  // Step 1 form
  const step1Form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      role: "entrepreneur" as const,
      acceptTerms: false,
    },
  });

  // Step 2 forms
  const step2StudentForm = useForm<z.infer<typeof step2SchemaStudent>>({
    resolver: zodResolver(step2SchemaStudent),
    defaultValues: {
      specialty: "",
      bio: "",
      portfolioUrl: "",
      formation: "", // Add the formation field default value
    },
  });

  const step2EntrepreneurForm = useForm<z.infer<typeof step2SchemaEntrepreneur>>({
    resolver: zodResolver(step2SchemaEntrepreneur),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
    },
  });

  // Step 3 forms
  const step3StudentForm = useForm<z.infer<typeof step3SchemaStudent>>({
    resolver: zodResolver(step3SchemaStudent),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
    },
  });

  const step3EntrepreneurForm = useForm<z.infer<typeof step3SchemaEntrepreneur>>({
    resolver: zodResolver(step3SchemaEntrepreneur),
    defaultValues: {
      companyName: "",
      companyRole: "",
      siret: "",
      companyAddress: "",
    },
  });

  // Step 4 form for students
  const step4StudentForm = useForm<z.infer<typeof step4SchemaStudent>>({
    resolver: zodResolver(step4SchemaStudent),
    defaultValues: {
      siret: "",
      address: "",
      iban: "",
    },
  });

  // Initialize forms when the component mounts
  useEffect(() => {
    step1Form.reset({
      email: formValues.email,
      password: formValues.password,
      confirmPassword: formValues.confirmPassword,
      role: formValues.role,
      acceptTerms: formValues.acceptTerms || false,
    });
  }, []);

  // Handle avatar upload for registration
  const handleFileSelect = async (file: File) => {
    try {
      setIsLoading(true);
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload the file to the pp bucket
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
        
      const profilePictureUrl = urlData.publicUrl;
      setAvatarUrl(profilePictureUrl);
      toast.success("Profile picture uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading profile picture:", error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
      
      // Still create a temporary URL for preview
      const tempUrl = URL.createObjectURL(file);
      setAvatarUrl(tempUrl);
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

  // Handle Step 1 submission
  const onSubmitStep1 = (values: z.infer<typeof step1Schema>) => {
    setFormValues(prev => ({ 
      ...prev, 
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      role: values.role,
      acceptTerms: values.acceptTerms
    }));
    
    // Reset step 2 forms based on role
    if (values.role === "student") {
      step2StudentForm.reset({
        specialty: "",
        bio: "",
        portfolioUrl: "",
      });
    } else {
      step2EntrepreneurForm.reset({
        firstName: "",
        lastName: "",
        phoneNumber: "",
      });
    }
    
    setStep(2);
  };

  // Handle Step 2 submission
  const onSubmitStep2Student = (values: z.infer<typeof step2SchemaStudent>) => {
    setFormValues(prev => ({
      ...prev,
      specialty: values.specialty,
      bio: values.bio,
      portfolioUrl: values.portfolioUrl,
      formation: values.formation, // Add formation to form values
      skills: selectedSkills
    }));
    
    // Reset step 3 student form
    step3StudentForm.reset({
      firstName: "",
      lastName: "",
      phoneNumber: "",
    });
    
    setStep(3);
  };

  const onSubmitStep2Entrepreneur = (values: z.infer<typeof step2SchemaEntrepreneur>) => {
    setFormValues(prev => ({
      ...prev,
      firstName: values.firstName,
      lastName: values.lastName,
      phoneNumber: values.phoneNumber
    }));
    
    // Reset step 3 entrepreneur form
    step3EntrepreneurForm.reset({
      companyName: "",
      companyRole: "",
      siret: "",
      companyAddress: "",
    });
    
    setStep(3);
  };

  // Handle Step 3 submission
  const onSubmitStep3Student = (values: z.infer<typeof step3SchemaStudent>) => {
    setFormValues(prev => ({
      ...prev,
      firstName: values.firstName,
      lastName: values.lastName,
      phoneNumber: values.phoneNumber,
      avatar: avatarUrl
    }));
    
    // Reset step 4 student form
    step4StudentForm.reset({
      siret: "",
      address: "",
      iban: "",
    });
    
    setStep(4);
  };

  const onSubmitStep3Entrepreneur = (values: z.infer<typeof step3SchemaEntrepreneur>) => {
    setFormValues(prev => ({ 
      ...prev, 
      companyName: values.companyName,
      companyRole: values.companyRole,
      siret: values.siret,
      companyAddress: values.companyAddress,
      avatar: avatarUrl
    }));
    setStep(4);
  };

  // Handle Step 4 submission
  const onSubmitStep4Student = async (values: z.infer<typeof step4SchemaStudent>) => {
    const finalFormValues = { 
      ...formValues, 
      siret: values.siret,
      address: values.address,
      iban: values.iban
    };
    
    setFormValues(finalFormValues);
    await finalSubmit(finalFormValues);
  };

  const onSkipProject = async () => {
    setFormSubmitting(true);
    const updatedValues = { ...formValues, skipProject: true };
    setFormValues(updatedValues);
    await finalSubmit(updatedValues);
    setFormSubmitting(false);
  };

  const onAddProject = async () => {
    setFormSubmitting(true);
    try {
      // Register the user first with project info
      await finalSubmit(formValues);
      // Then navigate to new project page if successful
      if (registrationCompleted) {
        navigate("/projects/new");
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Final submit function - now including profile picture URL
  const finalSubmit = async (values: FormValues) => {
    try {
      setFormSubmitting(true);
      // Create a name from first and last name
      const name = values.firstName && values.lastName 
        ? `${values.firstName} ${values.lastName}` 
        : "New User";
      
      // Get surname from values
      const surname = values.lastName || "User";
        
      // Log the data that will be sent to Supabase
      console.log("Submitting registration data:", {
        email: values.email,
        password: values.password,
        name,
        surname,
        role: values.role,
      });

      // Prepare user data for registration
      const userData = {
        about: values.bio,
        specialty: values.specialty,
        portfolioLink: values.portfolioUrl,
        formation: values.formation, // Add formation to userData
        phone: values.phoneNumber,
        address: values.address || values.companyAddress,
        iban: values.iban,
        companyName: values.companyName,
        companyRole: values.companyRole,
        siret: values.siret,
        skills: values.skills || selectedSkills,
        pp_link: avatarUrl, // Add the profile picture URL to the user data
        // Include additional fields that might be needed for project creation
        projectName: values.skipProject ? undefined : "New Project",
        projectDescription: values.skipProject ? undefined : "Project description",
        projectDeadline: values.skipProject ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      console.log("User metadata for registration:", userData);
      
      // Register user with all necessary data
      const result = await authRegister(
        values.email, 
        values.password, 
        name, 
        surname, 
        values.role, 
        userData
      );
      
      if (!result.error) {
        setRegistrationCompleted(true);
        // Move to thank you step if we're not already on it
        if (step !== 5) {
          setStep(5);
        }
      } else {
        toast.error(result.error || "Registration failed. Please try again.");
        setFormSubmitting(false);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error?.message || "Registration failed. Please try again.");
      setFormSubmitting(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Render the appropriate step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Form {...step1Form}>
            <form onSubmit={step1Form.handleSubmit(onSubmitStep1)} className="space-y-4">
              <FormField
                control={step1Form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>I am a:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="student" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Student - I want to work on web projects
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="entrepreneur" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Entrepreneur - I need web design services
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step1Form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="example@email.com" 
                        {...field} 
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step1Form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="******" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step1Form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="******" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step1Form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="terms"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="terms" className="font-normal">
                        I accept the{" "}
                        <Link to="/terms" className="text-tiro-purple hover:underline">
                          Terms of Use
                        </Link>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                disabled={formSubmitting}
              >
                {formSubmitting ? "Processing..." : "Next"}
              </Button>
            </form>
          </Form>
        );

      case 2:
        return formValues.role === "student" ? (
          <Form {...step2StudentForm}>
            <form onSubmit={step2StudentForm.handleSubmit(onSubmitStep2Student)} className="space-y-4">
              <FormField
                control={step2StudentForm.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What's your specialty?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="ui_ux" />
                          </FormControl>
                          <FormLabel className="font-normal">UI/UX Design</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="front_end" />
                          </FormControl>
                          <FormLabel className="font-normal">Front-end Development</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="full_stack" />
                          </FormControl>
                          <FormLabel className="font-normal">Full Stack Development</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="web_design" />
                          </FormControl>
                          <FormLabel className="font-normal">Web Design</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step2StudentForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About You</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about your skills, experience, and interests..." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={step2StudentForm.control}
                name="formation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Education or Training</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your education or training" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step2StudentForm.control}
                name="portfolioUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="yourportfolio.com" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Skills selection with checkboxes */}
              <div className="space-y-2">
                <Label>Skills (select all that apply)</Label>
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

              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBack}
                  disabled={formSubmitting}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Processing..." : "Next"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...step2EntrepreneurForm}>
            <form onSubmit={step2EntrepreneurForm.handleSubmit(onSubmitStep2Entrepreneur)} className="space-y-4">
              <FormField
                control={step2EntrepreneurForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step2EntrepreneurForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Doe" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step2EntrepreneurForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+33612345678" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBack}
                  disabled={formSubmitting}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Processing..." : "Next"}
                </Button>
              </div>
            </form>
          </Form>
        );

      case 3:
        return formValues.role === "student" ? (
          <Form {...step3StudentForm}>
            <form onSubmit={step3StudentForm.handleSubmit(onSubmitStep3Student)} className="space-y-4">
              {/* Profile Picture Upload */}
              <div className="flex flex-col gap-4 items-center mb-4">
                <Label className="self-start">Profile Picture</Label>
                <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-start">
                  <Avatar className="w-24 h-24">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback>
                        {formValues.firstName ? formValues.firstName.charAt(0) : '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <FileUpload 
                    onFileSelect={handleFileSelect} 
                    accept="image/*"
                    buttonText="Upload Profile Picture"
                  />
                </div>
              </div>

              <FormField
                control={step3StudentForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step3StudentForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Doe" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step3StudentForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+33612345678" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBack}
                  disabled={formSubmitting || isLoading}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={formSubmitting || isLoading}
                >
                  {formSubmitting ? "Processing..." : "Next"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...step3EntrepreneurForm}>
            <form onSubmit={step3EntrepreneurForm.handleSubmit(onSubmitStep3Entrepreneur)} className="space-y-4">
              {/* Profile Picture Upload */}
              <div className="flex flex-col gap-4 items-center mb-4">
                <Label className="self-start">Profile Picture</Label>
                <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-start">
                  <Avatar className="w-24 h-24">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback>
                        {formValues.firstName ? formValues.firstName.charAt(0) : '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <FileUpload 
                    onFileSelect={handleFileSelect} 
                    accept="image/*"
                    buttonText="Upload Profile Picture"
                  />
                </div>
              </div>

              <FormField
                control={step3EntrepreneurForm.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ACME Inc." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step3EntrepreneurForm.control}
                name="companyRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Role in the Company</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="CEO, CTO, Project Manager, etc." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step3EntrepreneurForm.control}
                name="siret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SIRET Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="12345678901234" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step3EntrepreneurForm.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Full address of your company" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBack}
                  disabled={formSubmitting || isLoading}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={formSubmitting || isLoading}
                >
                  {formSubmitting ? "Processing..." : "Next"}
                </Button>
              </div>
            </form>
          </Form>
        );

      case 4:
        return formValues.role === "student" ? (
          <Form {...step4StudentForm}>
            <form onSubmit={step4StudentForm.handleSubmit(onSubmitStep4Student)} className="space-y-4">
              <FormField
                control={step4StudentForm.control}
                name="siret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SIRET Number (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="12345678901234" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step4StudentForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Your full address" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step4StudentForm.control}
                name="iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IBAN</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="FR76 1234 5678 9012 3456 7890 123" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBack}
                  disabled={formSubmitting}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Processing..." : "Complete Registration"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Would you like to add a project now?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                You can also add projects later from your dashboard.
              </p>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button 
                variant="outline" 
                onClick={onSkipProject}
                disabled={formSubmitting}
              >
                {formSubmitting ? "Processing..." : "Skip for now"}
              </Button>
              <Button 
                onClick={onAddProject}
                className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                disabled={formSubmitting}
              >
                {formSubmitting ? "Processing..." : "Add Project"}
              </Button>
            </div>
            
            <div className="flex justify-start">
              <Button 
                type="button" 
                variant="link" 
                onClick={goBack}
                disabled={formSubmitting}
              >
                Back
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold">Thank You for Signing Up!</h2>
            
            <p className="text-muted-foreground">
              {formValues.role === "student" 
                ? "Your student account has been created successfully. You can now browse available projects and start collaborating with entrepreneurs."
                : "Your entrepreneur account has been created successfully. You can now create projects and find talented students to help with your web design needs."
              }
            </p>
            
            <Button 
              onClick={() => navigate("/dashboard")} 
              className="mt-4 bg-tiro-primary hover:bg-tiro-primary/90 text-white w-full"
              disabled={loading}
            >
              Go to Dashboard
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" alt="Tiro Logo" className="h-10" />
            </div>
            <CardDescription>
              {step === 5 ? "Registration Complete" : "Create your account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent key={step}>
            {renderStep()}
          </CardContent>
          
          {step !== 5 && (
            <CardFooter className="flex justify-center">
              <div className="text-sm text-center">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link to="/login" className="text-tiro-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Register;
