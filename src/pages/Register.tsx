
import React, { useState } from "react";
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

// Step 1 schema - Basic registration information
const step1Schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "entrepreneur"] as const),
  confidenceCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(
  (data) => data.role !== "student" || (data.confidenceCode && data.confidenceCode.length > 0),
  {
    message: "Confidence code is required for students",
    path: ["confidenceCode"],
  }
);

// Step 2 schema - Role-specific information (part 1)
const step2SchemaStudent = z.object({
  specialty: z.string().min(1, "Please select a specialty"),
  bio: z.string().min(10, "Please provide at least 10 characters about yourself"),
  portfolioUrl: z.string().url("Please enter a valid URL").or(z.string().length(0)),
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
  isFreelance: z.boolean(),
  siret: z.string().optional(),
  address: z.string().min(5, "Please enter a valid address"),
  iban: z.string().min(15, "Please enter a valid IBAN"),
}).refine(
  (data) => !data.isFreelance || (data.siret && data.siret.length >= 14),
  {
    message: "SIRET number is required for freelancers",
    path: ["siret"],
  }
);

// Combined type for all form values
type FormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  role: "student" | "entrepreneur";
  confidenceCode?: string;
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
  skipProject?: boolean;
};

const Register = () => {
  const { register: authRegister, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formValues, setFormValues] = useState<FormValues>({
    email: "",
    password: "",
    confirmPassword: "",
    role: "entrepreneur",
  });
  
  // Step 1 form
  const step1Form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      email: formValues.email,
      password: formValues.password,
      confirmPassword: formValues.confirmPassword,
      role: formValues.role,
      confidenceCode: formValues.confidenceCode || "",
    },
  });

  // Step 2 forms
  const step2StudentForm = useForm<z.infer<typeof step2SchemaStudent>>({
    resolver: zodResolver(step2SchemaStudent),
    defaultValues: {
      specialty: formValues.specialty || "",
      bio: formValues.bio || "",
      portfolioUrl: formValues.portfolioUrl || "",
    },
  });

  const step2EntrepreneurForm = useForm<z.infer<typeof step2SchemaEntrepreneur>>({
    resolver: zodResolver(step2SchemaEntrepreneur),
    defaultValues: {
      firstName: formValues.firstName || "",
      lastName: formValues.lastName || "",
      phoneNumber: formValues.phoneNumber || "",
    },
  });

  // Step 3 forms
  const step3StudentForm = useForm<z.infer<typeof step3SchemaStudent>>({
    resolver: zodResolver(step3SchemaStudent),
    defaultValues: {
      firstName: formValues.firstName || "",
      lastName: formValues.lastName || "",
      phoneNumber: formValues.phoneNumber || "",
    },
  });

  const step3EntrepreneurForm = useForm<z.infer<typeof step3SchemaEntrepreneur>>({
    resolver: zodResolver(step3SchemaEntrepreneur),
    defaultValues: {
      companyName: formValues.companyName || "",
      companyRole: formValues.companyRole || "", 
      siret: formValues.siret || "",
      companyAddress: formValues.companyAddress || "",
    },
  });

  // Step 4 form for students
  const step4StudentForm = useForm<z.infer<typeof step4SchemaStudent>>({
    resolver: zodResolver(step4SchemaStudent),
    defaultValues: {
      isFreelance: formValues.isFreelance || false,
      siret: formValues.siret || "",
      address: formValues.address || "",
      iban: formValues.iban || "",
    },
  });

  // Handle Step 1 submission
  const onSubmitStep1 = (values: z.infer<typeof step1Schema>) => {
    setFormValues({ ...formValues, ...values });
    setStep(2);
  };

  // Handle Step 2 submission
  const onSubmitStep2Student = (values: z.infer<typeof step2SchemaStudent>) => {
    setFormValues({ ...formValues, ...values });
    setStep(3);
  };

  const onSubmitStep2Entrepreneur = (values: z.infer<typeof step2SchemaEntrepreneur>) => {
    setFormValues({ ...formValues, ...values });
    setStep(3);
  };

  // Handle Step 3 submission
  const onSubmitStep3Student = (values: z.infer<typeof step3SchemaStudent>) => {
    setFormValues({ ...formValues, ...values });
    setStep(4);
  };

  const onSubmitStep3Entrepreneur = (values: z.infer<typeof step3SchemaEntrepreneur>) => {
    // Fixed: store values with the correct type
    setFormValues({ 
      ...formValues, 
      companyName: values.companyName,
      companyRole: values.companyRole,
      siret: values.siret,
      companyAddress: values.companyAddress
    });
    setStep(4);
  };

  // Handle Step 4 submission
  const onSubmitStep4Student = async (values: z.infer<typeof step4SchemaStudent>) => {
    const finalFormValues = { ...formValues, ...values };
    setFormValues(finalFormValues);
    await finalSubmit(finalFormValues);
  };

  const onSkipProject = () => {
    // Make sure to cast or ensure that skipProject becomes a boolean
    setFormValues(current => ({ ...current, skipProject: true }));
    setStep(5);
  };

  const onAddProject = () => {
    // Register the user first
    finalSubmit(formValues).then(() => {
      // Then navigate to new project page
      navigate("/projects/new");
    });
  };

  // Final submit function
  const finalSubmit = async (values: FormValues) => {
    try {
      // Create a name from first and last name
      const name = values.firstName && values.lastName 
        ? `${values.firstName} ${values.lastName}` 
        : "New User";
        
      // Register the user with the constructed profile data
      const userData = {
        bio: values.bio,
        specialty: values.specialty,
        portfolioUrl: values.portfolioUrl,
        phoneNumber: values.phoneNumber,
        isFreelance: values.isFreelance,
        siret: values.siret,
        address: values.address,
        iban: values.iban,
        companyName: values.companyName,
        companyRole: values.companyRole,
        companyAddress: values.companyAddress,
      };
      
      await authRegister(values.email, values.password, name, values.role, userData);
      
      // Move to thank you step if we're not already on it
      if (step !== 5) {
        setStep(5);
      }
    } catch (error) {
      console.error("Registration error:", error);
      // Error is handled by auth context with toast
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Reset forms when step changes
  React.useEffect(() => {
    switch(step) {
      case 1:
        step1Form.reset({
          email: formValues.email,
          password: formValues.password,
          confirmPassword: formValues.confirmPassword,
          role: formValues.role,
          confidenceCode: formValues.confidenceCode || "",
        });
        break;
      case 2:
        if (formValues.role === "student") {
          step2StudentForm.reset({
            specialty: formValues.specialty || "",
            bio: formValues.bio || "",
            portfolioUrl: formValues.portfolioUrl || "",
          });
        } else {
          step2EntrepreneurForm.reset({
            firstName: formValues.firstName || "",
            lastName: formValues.lastName || "",
            phoneNumber: formValues.phoneNumber || "",
          });
        }
        break;
      case 3:
        if (formValues.role === "student") {
          step3StudentForm.reset({
            firstName: formValues.firstName || "",
            lastName: formValues.lastName || "",
            phoneNumber: formValues.phoneNumber || "",
          });
        } else {
          step3EntrepreneurForm.reset({
            companyName: formValues.companyName || "",
            companyRole: formValues.companyRole || "",
            siret: formValues.siret || "",
            companyAddress: formValues.companyAddress || "",
          });
        }
        break;
      case 4:
        if (formValues.role === "student") {
          step4StudentForm.reset({
            isFreelance: formValues.isFreelance || false,
            siret: formValues.siret || "",
            address: formValues.address || "",
            iban: formValues.iban || "",
          });
        }
        break;
    }
  }, [step, formValues]);

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
                        value={field.value}
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

              {step1Form.watch("role") === "student" && (
                <FormField
                  control={step1Form.control}
                  name="confidenceCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confidence Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your student confidence code" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button 
                type="submit" 
                className="w-full bg-tiro-purple hover:bg-tiro-purple/90"
                disabled={loading}
              >
                {loading ? "Processing..." : "Next"}
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
                        value={field.value}
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
                name="portfolioUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio URL (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://yourportfolio.com" 
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
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-purple hover:bg-tiro-purple/90"
                  disabled={loading}
                >
                  Next
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
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-purple hover:bg-tiro-purple/90"
                  disabled={loading}
                >
                  Next
                </Button>
              </div>
            </form>
          </Form>
        );

      case 3:
        return formValues.role === "student" ? (
          <Form {...step3StudentForm}>
            <form onSubmit={step3StudentForm.handleSubmit(onSubmitStep3Student)} className="space-y-4">
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
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-purple hover:bg-tiro-purple/90"
                  disabled={loading}
                >
                  Next
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...step3EntrepreneurForm}>
            <form onSubmit={step3EntrepreneurForm.handleSubmit(onSubmitStep3Entrepreneur)} className="space-y-4">
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
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-purple hover:bg-tiro-purple/90"
                  disabled={loading}
                >
                  Next
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
                name="isFreelance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Are you a freelancer?
                      </FormLabel>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 text-tiro-purple focus:ring-tiro-purple"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {step4StudentForm.watch("isFreelance") && (
                <FormField
                  control={step4StudentForm.control}
                  name="siret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SIRET Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12345678901234" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-purple hover:bg-tiro-purple/90"
                  disabled={loading}
                >
                  Complete Registration
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
                disabled={loading}
              >
                Skip for now
              </Button>
              <Button 
                onClick={onAddProject}
                className="bg-tiro-purple hover:bg-tiro-purple/90"
                disabled={loading}
              >
                Add Project
              </Button>
            </div>
            
            <div className="flex justify-start">
              <Button 
                type="button" 
                variant="link" 
                onClick={goBack}
                disabled={loading}
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
              className="mt-4 bg-tiro-purple hover:bg-tiro-purple/90 w-full"
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

  // Progress indicator
  const renderProgress = () => {
    return (
      <div className="flex justify-between mb-8">
        {[1, 2, 3, 4, 5].map((stepNumber) => (
          <div key={stepNumber} className="flex flex-col items-center">
            <div 
              className={`rounded-full w-8 h-8 flex items-center justify-center border-2 ${
                step === stepNumber 
                  ? "border-tiro-purple bg-tiro-purple text-white" 
                  : step > stepNumber 
                    ? "border-green-500 bg-green-500 text-white" 
                    : "border-gray-300 text-gray-400"
              }`}
            >
              {step > stepNumber ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                stepNumber
              )}
            </div>
            <span className={`text-xs mt-1 ${
              step >= stepNumber ? "text-tiro-purple" : "text-gray-400"
            }`}>
              Step {stepNumber}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold text-tiro-purple">Tiro</CardTitle>
            <CardDescription>
              {step === 5 ? "Registration Complete" : "Create your account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {step < 5 && renderProgress()}
            {renderStep()}
          </CardContent>
          
          {step !== 5 && (
            <CardFooter className="flex justify-center">
              <div className="text-sm text-center">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link to="/login" className="text-tiro-purple hover:underline">
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
