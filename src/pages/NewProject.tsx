import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useProjects } from "@/context/project-context";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProjectPack {
  id: string;
  name: string;
  description: string;
}

interface ServiceSelection {
  serviceId: string;
  quantity: number;
  price: number;
}

interface LocationState {
  selectedPack: ProjectPack;
  selectedServices?: ServiceSelection[];
  totalPrice?: number;
}

const formSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  packId: z.string().uuid("Pack ID invalide"),
  deadline: z.date().optional()
});

type FormValues = z.infer<typeof formSchema>;

const NewProject = () => {
  const { loadProjects } = useProjects();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entrepreneurId, setEntrepreneurId] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [packRecap, setPackRecap] = useState<string>('');
  const [packPrice, setPackPrice] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // Get the selected pack from location state
  const locationState = location.state as LocationState | undefined;
  const selectedPack = locationState?.selectedPack;
  const selectedServices = locationState?.selectedServices || [];
  const totalPrice = locationState?.totalPrice || 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      packId: selectedPack?.id || "",
      deadline: undefined
    }
  });

  // Fetch entrepreneur ID and services when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          // Fetch entrepreneur ID
          console.log("Fetching entrepreneur ID for user:", user.id);
          const {
            data,
            error
          } = await supabase.from('entrepreneurs').select('id_entrepreneur').eq('id_user', user.id).single();
          console.log("Entrepreneur query result:", {
            data,
            error
          });
          if (data) {
            console.log("Found entrepreneur ID:", data.id_entrepreneur);
            setEntrepreneurId(data.id_entrepreneur);
          } else if (error) {
            console.error("Error fetching entrepreneur ID:", error);
            if (error.code === 'PGRST116') {
              toast.error("Aucun profil d'entrepreneur n'a été trouvé, veuillez d'abord finir de compléter votre profil");
            } else {
              toast.error("La recherche de votre profil d'entrepreneur a échouée");
            }
          }

          // Fetch pack recap if we have a selected pack
          if (selectedPack?.id) {
            const { data: packData, error: packError } = await supabase
              .from('project_packs')
              .select('recap, price')
              .eq('id_pack', selectedPack.id)
              .maybeSingle();

            if (packError) {
              console.error("Error fetching pack recap:", packError);
            } else if (packData) {
              setPackRecap((packData as any).recap || '');
              setPackPrice((packData as any).price || null);
            }
          }

          // Fetch services if we have selected services
          if (selectedServices.length > 0) {
            const serviceIds = selectedServices.map(s => s.serviceId);
            const { data: servicesData, error: servicesError } = await supabase
              .from('services')
              .select('*')
              .in('service_id', serviceIds);

            if (servicesError) {
              console.error("Error fetching services:", servicesError);
            } else {
              setServices(servicesData || []);
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          toast.error("Erreur lors du chargement des données");
        }
      }
    };
    fetchData();
  }, [user, selectedServices, selectedPack?.id]);

  // Redirect to pack selection if no pack is selected
  React.useEffect(() => {
    if (!selectedPack) {
      navigate("/pack-selection", {
        replace: true
      });
    }
  }, [selectedPack, navigate]);

  const onSubmit = async (values: FormValues) => {
    console.log("🚀 onSubmit started with values:", values);
    console.log("🔍 Current user:", { id: user?.id, email: user?.email });
    console.log("🔍 Current entrepreneurId:", entrepreneurId);
    console.log("🔍 LocationState:", locationState);
    
    if (!user) {
      console.error("❌ No user found");
      toast.error("Vous devez être connecté pour pouvoir créer un projet");
      return;
    }
    
    if (!entrepreneurId) {
      console.error("❌ No entrepreneur ID found");
      toast.error("No entrepreneur profile found. Please complete your profile first.");
      return;
    }

    // Determine project price - use selected services total or pack price
    let projectPrice = null;
    console.log("💰 Determining project price...");
    
    if (locationState?.selectedServices && locationState.selectedServices.length > 0) {
      projectPrice = locationState.totalPrice;
      console.log("💰 Using services total price:", projectPrice);
    } else {
      console.log("💰 Fetching pack price for pack ID:", values.packId);
      // Get the pack details to determine price
      const { data: packData, error: packError } = await supabase
        .from('project_packs')
        .select('price, name')
        .eq('id_pack', values.packId)
        .maybeSingle();

      console.log("💰 Pack query result:", { packData, packError });

      if (packError) {
        console.error("❌ Error fetching pack:", packError);
        throw new Error(`Failed to fetch pack details: ${packError.message}`);
      }

      if (packData && packData.name !== 'Devis personnalisé') {
        projectPrice = packData.price;
        console.log("💰 Using pack price:", projectPrice);
      } else {
        console.log("💰 Custom quote - no price set");
      }
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("📝 Preparing project insert with data:");
      
      // Create devis without pack description
      let finalDevis = '';
      
      if (locationState?.selectedServices && locationState.selectedServices.length > 0) {
        for (const selection of locationState.selectedServices) {
          const service = services.find(s => s.service_id === selection.serviceId);
          if (service) {
            finalDevis += `• ${service.title} - Quantité: ${selection.quantity}\n`;
            if (service.description) {
              finalDevis += `  ${service.description}\n`;
            }
          }
        }
      }
      
      const projectInsertData = {
        title: values.title,
        description: values.description,
        id_entrepreneur: entrepreneurId,
        id_pack: values.packId,
        status: 'STEP1',
        deadline: values.deadline ? format(values.deadline, 'yyyy-MM-dd') : null,
        price: projectPrice,
        devis: finalDevis || null
      };
      console.log("📝 Project insert data:", projectInsertData);

      console.log("🚀 Starting project insertion...");
      // Create the project with proper error handling
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert(projectInsertData)
        .select('id_project')
        .maybeSingle();
        
      console.log("📝 Project insert result:", { projectData, projectError });
      
      if (projectError) {
        console.error("❌ Project creation error details:", {
          message: projectError.message,
          details: projectError.details,
          hint: projectError.hint,
          code: projectError.code
        });
        throw new Error(`Failed to create project: ${projectError.message}`);
      }
      
      if (!projectData) {
        console.error("❌ No project data returned after creation");
        throw new Error("No project data returned after creation");
      }
      
      console.log("✅ Project created successfully:", projectData);
      const projectId = projectData.id_project;

      // Insert selected services into project_services table
      if (locationState?.selectedServices && locationState.selectedServices.length > 0) {
        console.log("💾 Inserting project services...");
        
        const projectServicesData = locationState.selectedServices.map(selection => ({
          project_id: projectId,
          service_id: selection.serviceId,
          quantity: selection.quantity,
          unit_price: selection.price
        }));
        
        const { error: servicesError } = await supabase
          .from('project_services')
          .insert(projectServicesData);
        
        if (servicesError) {
          console.error("❌ Error inserting project services:", servicesError);
          // Don't fail the entire project creation for this
          toast.error("Attention: Les services n'ont pas pu être sauvegardés correctement");
        } else {
          console.log("✅ Project services inserted successfully");
        }
      }

      // Create message group for the project
      // The database trigger handles message group creation automatically
      console.log("💬 Message group will be created automatically by database trigger for project:", projectId);

      // Reload projects to get the latest data
      console.log("🔄 Reloading projects...");
      await loadProjects();
      console.log("✅ Projects reloaded successfully");
      
      toast.success("Projet créé avec succès!");

      // Navigate to the specific project page instead of projects list
      console.log("🧭 Navigating to project page:", `/projects/${projectId}`);
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("❌ Error creating project:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Erreur lors de la création du projet: ${errorMessage}`);
    } finally {
      console.log("🏁 Setting isSubmitting to false");
      setIsSubmitting(false);
    }
  };

  if (!selectedPack) {
    return null; // Will redirect to pack selection
  }

  return (
    <div className="w-full max-w-3xl mx-auto pb-8 px-4 sm:px-6">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/pack-selection")} 
          className="flex items-center text-muted-foregreen hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la sélection de pack
        </Button>
      </div>

      <Card className="w-full mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Besoin d'accompagnement ?</h3>
              <p className="text-muted-foreground">
                Si vous avez la moindre question sur votre projet, notre équipe est là pour vous accompagner.
              </p>
              <p className="text-muted-foreground">
                Réservez un appel gratuit pour discuter de vos besoins.
              </p>
            </div>
            <Button 
              onClick={() => window.open('https://tiro.agency/reserver-meeting', '_blank')}
              className="ml-4 bg-primary hover:bg-primary/90 whitespace-nowrap"
            >
              Réserver un appel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pack Summary - Show for all packs */}
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Récapitulatif de votre sélection
          </CardTitle>
          <CardDescription>
            {selectedPack?.name === 'Devis personnalisé' 
              ? 'Services choisis pour votre devis personnalisé'
              : 'Pack sélectionné pour votre projet'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pack Information */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-semibold text-lg text-foreground mb-2">{selectedPack?.name}</h4>
              <div className="text-sm text-muted-foreground mb-3">
                {(packRecap || selectedPack?.description)?.split(' - ').map((item, index) => (
                  <div key={index} className="mb-1">{item.trim()}</div>
                ))}
              </div>
            </div>

            {/* Services for custom quote */}
            {selectedPack?.name === 'Devis personnalisé' && selectedServices.length > 0 && (
              <>
                {selectedServices.map((selection) => {
                  const service = services.find(s => s.service_id === selection.serviceId);
                  if (!service) return null;

                  return (
                    <div key={selection.serviceId} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{service.title}</h4>
                        {service.description && (
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        )}
                        <p className="text-sm font-medium text-primary mt-1">
                          Quantité: {selection.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {(selection.price * selection.quantity).toFixed(0)}€
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            
            {/* Total pricing */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>
                  {selectedPack?.name === 'Devis personnalisé' ? 'Total estimé:' : 'Prix du pack:'}
                </span>
                <span className="text-primary">
                  {selectedPack?.name === 'Devis personnalisé' && totalPrice > 0
                    ? `${totalPrice.toFixed(0)}€`
                    : selectedPack?.name !== 'Devis personnalisé' && packPrice
                    ? `${packPrice}€`
                    : selectedPack?.name !== 'Devis personnalisé'
                    ? 'Sur devis'
                    : 'À déterminer'
                  }
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedPack?.name === 'Devis personnalisé' 
                  ? '*Prix indicatif - Un devis détaillé vous sera fourni après validation'
                  : '*Un devis personnalisé sera établi selon vos besoins spécifiques'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Créer nouveau projet</CardTitle>
          <CardDescription>
            Les détails pour votre nouveau projet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!entrepreneurId && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800">
                Chargement de votre profil d'entrepreneur
              </p>
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="packId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pack de projet</FormLabel>
                    <Select defaultValue={field.value} onValueChange={field.onChange} disabled>
                      <FormControl className="bg-tiro-white">
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un pack" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={selectedPack.id}>
                          {selectedPack.name}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium text-gray-700">
                      Titre du projet
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Développement d'une application mobile"
                        className="border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium text-gray-700">
                      Description du projet
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez votre projet en détail..."
                        className="min-h-[100px] border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-base font-medium text-gray-700">
                      Date limite (optionnelle)
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal border-gray-300",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Choisir une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/pack-selection")}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !entrepreneurId}
                  className="flex-1"
                >
                  {isSubmitting ? "Création..." : "Créer le projet"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewProject;