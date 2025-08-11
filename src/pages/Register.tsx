import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

// Declare global grecaptcha
declare global {
  interface Window {
    grecaptcha: any;
  }
}

// List of available skills for checkboxes
const AVAILABLE_SKILLS = [
  "Adobe After Effects",
  "Adobe Illustrator", 
  "Adobe InDesign", 
  "Adobe Photoshop",
  "Adobe Premiere Pro", 
  "Adobe XD", 
  "Canva", 
  "CorelDRAW", 
  "DaVinci Resolve",
  "Figma",
  "Final Cut Pro",
  "Framer",
  "Sketch"
];

// Step 1 schema - Basic registration information
const step1Schema = z.object({
  email: z.string().email("Adresse mail invalide"),
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
    .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial"),
  confirmPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum(["student", "entrepreneur"] as const),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Vous devez accepter les conditions d'utilisation",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Step 2 schema - Role-specific information (part 1)
const step2SchemaStudent = z.object({
  specialty: z.array(z.string()).min(1, "Veuillez sélectionner au moins une spécialité"),
  bio: z.string().min(10, "La bio doit contenir au moins 10 caractères"),
  formation: z.string().min(1, "Veuillez indiquer votre formation"),
  portfolioUrl: z
    .string()
    .transform((val) => {
      if (!val) return "";
      return val.startsWith("http://") || val.startsWith("https://")
        ? val
        : `https://${val}`;
    })
    .refine((val) => {
      if (!val) return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, {
      message: "L'URL du portfolio doit être valide",
    })
    .optional(),
});

const step2SchemaEntrepreneur = z.object({
  firstName: z.string().min(2, "Votre prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Votre nom doit contenir au moins 2 caractères"),
  phoneNumber: z.string()
    .min(10, "Veuillez fournir un numéro de téléphone valide")
    .regex(/^[0-9]+$/, "Le numéro de téléphone ne doit contenir que des chiffres"),
});

// Step 3 schema - Role-specific information (part 2)
const step3SchemaStudent = z.object({
  firstName: z.string().min(2, "Votre prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Votre nom doit contenir au moins 2 caractères"),
  phoneNumber: z.string()
    .min(10, "Veuillez fournir un numéro de téléphone valide")
    .regex(/^[0-9]+$/, "Le numéro de téléphone ne doit contenir que des chiffres"),
});

const step3SchemaEntrepreneur = z.object({
  companyName: z.string().min(2, "Le nom de votre entreprise doit contenir au moins 2 caractères"),
  companyRole: z.string().min(2, "Votre role doit contenir au moins 2 caractères"),
  siret: z.string()
    .min(14, "Votre numéro de SIRET doit contenir 14 chiffres")
    .max(14, "Votre numéro de SIRET doit contenir 14 chiffres")
    .regex(/^[0-9]+$/, "Le numéro SIRET ne doit contenir que des chiffres"),
  companyAddress: z.string().min(5, "Veuillez entrer une adresse valide"),
});

// Step 4 schema - Additional information
const step4SchemaStudent = z.object({
  siret: z.string()
    .min(14, "Votre numéro de SIRET doit contenir 14 chiffres")
    .max(14, "Votre numéro de SIRET doit contenir 14 chiffres")
    .regex(/^[0-9]+$/, "Le numéro SIRET ne doit contenir que des chiffres")
    .optional(),
  address: z.string().min(5, "Veuillez entrer une adresse valide"),
  iban: z.string().min(15, "Veuillez entrer un IBAN valide"),
});

// Combined type for all form values
type FormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  role: "student" | "entrepreneur";
  acceptTerms: boolean;
  specialty?: string[];
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
  formation?: string;
};

const Register = () => {
  const { register: authRegister, user, session } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [registrationCompleted, setRegistrationCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  
  const [formValues, setFormValues] = useState<FormValues>({
    email: "",
    password: "",
    confirmPassword: "",
    role: "entrepreneur",
    acceptTerms: false,
  });

  // Load reCaptcha script
  useEffect(() => {
    const loadRecaptcha = () => {
      if (window.grecaptcha) {
        setRecaptchaLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=6LfgWJUrAAAAAL7BccALaFZ8r9eSnQGGYrN3DaPq';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setRecaptchaLoaded(true);
      };
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    };

    loadRecaptcha();
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && session) {
      console.log("Utilisateur déjà connecté, redirection vers le dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [user, session, navigate]);
  
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
      specialty: [],
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
          cacheControl: '31536000', // 1 an de cache navigateur
        });
        
      if (uploadError) {
        console.error('Erreur upload Supabase:', uploadError);
        throw uploadError;
      }
      
      const { data: urlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      const profilePictureUrl = urlData.publicUrl;
      console.log('URL publique générée:', profilePictureUrl);
      setAvatarUrl(profilePictureUrl);
    } catch (error: any) {
      console.error("Erreur du téléchargement de la photo de profil:", error);
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
        specialty: [],
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
      formation: values.formation,
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
    const updatedValues = { ...formValues, skipProject: true };
    setFormValues(updatedValues);
    await finalSubmit(updatedValues);
  };

  const onAddProject = async () => {
    // Register the user first with project info
    await finalSubmit(formValues).then(() => {
      // Then navigate to new project page if successful
      if (registrationCompleted) {
        navigate("/projects/new");
      }
    });
  };

  // Verify reCaptcha
  const verifyRecaptcha = async (): Promise<boolean> => {
    if (!recaptchaLoaded || !window.grecaptcha) {
      toast.error("reCaptcha non chargé");
      return false;
    }

    try {
      const token = await window.grecaptcha.execute('6LfgWJUrAAAAAL7BccALaFZ8r9eSnQGGYrN3DaPq', { action: 'register' });
      
      const response = await supabase.functions.invoke('verify-recaptcha', {
        body: { token }
      });

      if (response.error) {
        console.error('Erreur vérification reCaptcha:', response.error);
        toast.error("Erreur lors de la vérification de sécurité");
        return false;
      }

      if (!response.data?.success) {
        console.error('reCaptcha échoué:', response.data);
        toast.error("Vérification de sécurité échouée");
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur reCaptcha:', error);
      toast.error("Erreur lors de la vérification de sécurité");
      return false;
    }
  };

  // Final submit function - with reCaptcha verification
  const finalSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // Verify reCaptcha before proceeding
      const isRecaptchaValid = await verifyRecaptcha();
      if (!isRecaptchaValid) {
        return;
      }
      
      // Synchroniser l'avatar avec la dernière valeur uploadée
      values.avatar = avatarUrl;
      const name = values.firstName?.trim() || "Nouvel utilisateur";
      const surname = values.lastName?.trim() || "Nouvel utilisateur";
        
      console.log("Soumission des données d'inscription:", {
        email: values.email,
        name,
        surname,
        role: values.role,
      });

      // Prepare cleaned user data for registration
      const userData = {
        name,
        surname,
        role: values.role,
        about: values.bio || null,
        specialty: values.specialty || null,
        portfolioUrl: values.portfolioUrl || null,
        formation: values.formation || null,
        phoneNumber: values.phoneNumber || null,
        address: values.address || values.companyAddress || null,
        iban: values.iban || null,
        companyName: values.companyName || null,
        companyRole: values.companyRole || null,
        siret: values.siret || null,
        skills: selectedSkills.length > 0 ? selectedSkills : [],
        avatar: values.avatar || null,
      };
      
      console.log("Metadata utilisateur pour l'inscription:", userData);
      
      const result = await authRegister(
        values.email, 
        values.password, 
        userData
      );
      
      if (!result.error) {
        setRegistrationCompleted(true);
        if (step !== 5) {
          setStep(5);
        }
      } else {
        console.error("Inscription échouée:", result.error);
      }
    } catch (error: any) {
      console.error("Erreur de l'inscription:", error);
    } finally {
      setIsSubmitting(false);
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
            <form onSubmit={step1Form.handleSubmit(onSubmitStep1)} className="space-y-4 bg-tiro-white">
              <FormField
                control={step1Form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Je suis...</FormLabel>
                    <FormControl>
                      <div
                        role="radiogroup"
                        aria-label="Choisir votre rôle"
                        className="grid grid-cols-1 gap-4"
                      >
                        {[
                          {
                            value: "entrepreneur" as const,
                            title: "Entreprise",
                            description:
                              "Je cherche des juniors motivés pour travailler avec nous.",
                            img: "/placeholder.svg",
                            alt: "Illustration entreprise",
                          },
                          {
                            value: "student" as const,
                            title: "Freelance Junior",
                            description:
                              "Je crée mon profil pour intégrer la communauté et accéder aux missions.",
                            img: "/placeholder.svg",
                            alt: "Illustration freelance junior",
                          },
                        ].map((opt) => {
                          const selected = field.value === opt.value;
                          return (
                            <button
                              type="button"
                              key={opt.value}
                              role="radio"
                              aria-checked={selected}
                              onClick={() => field.onChange(opt.value)}
                              className={[
                                "relative w-full rounded-xl border",
                                "bg-card text-card-foreground",
                                "transition-all duration-200",
                                "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                selected ? "border-primary shadow-sm ring-1 ring-primary" : "border-border",
                                "p-4 sm:p-6 text-left min-h-[120px] sm:min-h-[140px]",
                              ].join(" ")}
                            >
                              <div className="flex items-center gap-4 md:gap-6">
                                <img
                                  src={opt.img}
                                  alt={opt.alt}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 object-contain"
                                />
                                <div className="space-y-1 flex-1">
                                  <h3 className="text-base sm:text-lg font-semibold">{opt.title}</h3>
                                  <p className="text-xs sm:text-sm text-muted-foreground">{opt.description}</p>
                                </div>
                              </div>
                              {selected && (
                                <div className="pointer-events-none absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
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
                    <FormLabel className="text-left">Email</FormLabel>
                    <FormControl className="bg-tiro-white">
                      <Input 
                        placeholder="exemple@email.com" 
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
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl className="bg-tiro-white">
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
                    <FormLabel>Confirmer mot de passe</FormLabel>
                    <FormControl className="bg-tiro-white">
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
                        className="h-4 w-4 shrink-0 min-w-[1rem] min-h-[1rem] max-w-[1rem] max-h-[1rem]"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="terms" className="font-normal">
                        J'accepte les{" "}
                        <a 
                          href="https://tiro.agency/conditions" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[#E74C3C] hover:underline"
                        >
                          Conditions d'utilisations
                        </a>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Suivant"}
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
                    <FormLabel>Quelles sont vos spécialités ?</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes("ui_ux")}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...currentValue, "ui_ux"]
                                    : currentValue.filter((value) => value !== "ui_ux")
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">UI/UX</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes("motion_design")}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...currentValue, "motion_design"]
                                    : currentValue.filter((value) => value !== "motion_design")
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Motion Design</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes("identite_visuelle")}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...currentValue, "identite_visuelle"]
                                    : currentValue.filter((value) => value !== "identite_visuelle")
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Identité Visuelle</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes("creation_contenu")}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...currentValue, "creation_contenu"]
                                    : currentValue.filter((value) => value !== "creation_contenu")
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Création de contenu</FormLabel>
                        </FormItem>
                      </div>
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
                    <FormLabel>A propos de vous</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Parlez nous de vos compétences, vos expériences et vos intérêts..." 
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
                    <FormLabel>Education ou formations</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Votre éducation ou formation" 
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
                        placeholder="votreportfolio.com" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Skills selection with checkboxes */}
              <div className="space-y-2">
                <Label>Compétences (Sélectionnez ce qui vous correspond)</Label>
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
                >
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  Suivant
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
                    <FormLabel className="text-left">Prénom</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John" 
                        {...field} 
                        className="bg-tiro-white"
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
                    <FormLabel className="text-left">Nom</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Doe" 
                        {...field}
                        className="bg-tiro-white"
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
                    <FormLabel className="text-left">Numéro de téléphone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0612345678" 
                        {...field}
                        className="bg-tiro-white"
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
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  Suivant
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
                <Label className="self-start">Photo de profil</Label>
                <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-center">
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
                    buttonText="Télécharger votre photo de profil"
                  />
                </div>
              </div>

              <FormField
                control={step3StudentForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-left">Prénom</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John" 
                        {...field}
                        className="bg-tiro-white" 
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
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Doe" 
                        {...field}
                        className="bg-tiro-white" 
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
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0612345678" 
                        {...field}
                        className="bg-tiro-white" 
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
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  Suivant
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...step3EntrepreneurForm}>
            <form onSubmit={step3EntrepreneurForm.handleSubmit(onSubmitStep3Entrepreneur)} className="space-y-4">
              {/* Profile Picture Upload */}
              <div className="flex flex-col gap-4 items-center mb-4">
                <Label className="self-start">Photo de profil</Label>
                <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-center">
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
                    buttonText="Télécharger votre photo de profil"
                  />
                </div>
              </div>

              <FormField
                control={step3EntrepreneurForm.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'entreprise</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Tiro Inc." 
                        {...field}
                        className="bg-tiro-white" 
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
                    <FormLabel>Votre rôle dans l'entreprise</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="CEO, CTO, Fondateur..." 
                        {...field}
                        className="bg-tiro-white" 
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
                    <FormLabel>Numéro SIRET</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="12345678901234" 
                        {...field}
                        className="bg-tiro-white" 
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
                    <FormLabel>Adresse de l'entreprise</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Adresse complète de l'entreprise" 
                        {...field}
                        className="bg-tiro-white" 
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
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  Suivant
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
                    <FormLabel>Numéro SIRET (optionel)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="12345678901234" 
                        {...field}
                        className="bg-tiro-white" 
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
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Votre adresse complète" 
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
                        className="bg-tiro-white" 
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
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  Terminer l'inscription
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Voulez-vous ajouter un projet maintenant ?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Vous pourrez également ajouter des projet sur votre tableau de bord
              </p>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button 
                variant="outline" 
                onClick={onSkipProject}
                disabled={isSubmitting}
              >
                Sauter pour le moment
              </Button>
              <Button 
                onClick={onAddProject}
                className="bg-tiro-primary hover:bg-tiro-primary/90 text-white"
                disabled={isSubmitting}
              >
                Ajouter un projet
              </Button>
            </div>
            
            <div className="flex justify-start">
              <Button 
                type="button" 
                variant="link" 
                onClick={goBack}
                disabled={isSubmitting}
              >
                Retour
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2-2"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold">Regardez vos mails !</h2>
            
            <div className="space-y-3 text-muted-foreground">
              <p>
                On vous a envoyés un mail au <strong className="text-foreground">{formValues.email}</strong>
              </p>
              <p>
              Veuillez cliquer sur le lien dans le mail de confirmation pour activer votre compte.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <p className="text-amber-800">
                  <strong>Important:</strong> L'email peut mettre quelques minutes à arriver.
                  N'hésiter pas à aller voir dans vos spam si vous ne le voyez pas dans votre boîte de récéption.
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate("/login")} 
              className="mt-4 bg-tiro-primary hover:bg-tiro-primary/90 text-white w-full"
              disabled={isSubmitting}
            >
              Go to Login
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-tiro-test py-10">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" alt="Tiro Logo" className="h-14" />
            </div>
          </CardHeader>
          
          <CardContent key={step}>
            {renderStep()}
          </CardContent>
          
          {step !== 5 && (
            <CardFooter className="flex justify-center">
              <div className="text-sm text-center">
                <span className="text-muted-foreground">Vous possédez déjà un compte? </span>
                <Link to="/login" className="text-tiro-primary hover:underline">
                  Se connecter
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
