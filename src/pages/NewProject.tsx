
import React, { useState, useEffect } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, Calendar } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { uploadFile, addDocumentToProject } from "@/services/document-service";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProjectPack {
  id: string;
  name: string;
  description: string;
}

interface LocationState {
  selectedPack: ProjectPack;
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entrepreneurId, setEntrepreneurId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Get the selected pack from location state
  const locationState = location.state as LocationState | undefined;
  const selectedPack = locationState?.selectedPack;

  // Fetch entrepreneur ID when component mounts
  useEffect(() => {
    const fetchEntrepreneurId = async () => {
      if (user) {
        try {
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
        } catch (error) {
          console.error("Error fetching entrepreneur ID:", error);
          toast.error("La recherche de votre profil d'entrepreneur n'a pas abouti");
        }
      }
    };
    fetchEntrepreneurId();
  }, [user]);

  // Redirect to pack selection if no pack is selected
  React.useEffect(() => {
    if (!selectedPack) {
      navigate("/pack-selection", {
        replace: true
      });
    }
  }, [selectedPack, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      packId: selectedPack?.id || "",
      deadline: undefined
    }
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error("Vous devez être connecté pour pouvoir créer un projet");
      return;
    }
    
    if (!entrepreneurId) {
      toast.error("No entrepreneur profile found. Please complete your profile first.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("Creating project with values:", values);

      // Get the pack details to determine price
      const { data: packData, error: packError } = await supabase
        .from('project_packs')
        .select('price, name')
        .eq('id_pack', values.packId)
        .single();

      if (packError) {
        console.error("Error fetching pack:", packError);
        throw new Error(`Failed to fetch pack details: ${packError.message}`);
      }

      // Determine the project price based on pack type
      let projectPrice = null;
      if (packData.name !== 'Devis personnalisé') {
        projectPrice = packData.price;
        console.log("Setting project price from pack:", projectPrice);
      } else {
        console.log("Custom quote project - price will be set by admin later");
      }

      // Create the project with proper error handling
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: values.title,
          description: values.description,
          id_entrepreneur: entrepreneurId,
          id_pack: values.packId,
          status: 'STEP1',
          deadline: values.deadline ? format(values.deadline, 'yyyy-MM-dd') : null,
          price: projectPrice
        })
        .select('id_project')
        .single();
        
      if (projectError) {
        console.error("Project creation error:", projectError);
        throw new Error(`Failed to create project: ${projectError.message}`);
      }
      
      if (!projectData) {
        throw new Error("No project data returned after creation");
      }
      
      console.log("Project created successfully:", projectData);
      const projectId = projectData.id_project;

      // Create message group for the project
      try {
        console.log("Creating message group for project:", projectId);

        // The database trigger should handle message group creation automatically
        // But let's verify it was created and create manually if needed
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger

        const {
          data: existingGroup,
          error: groupCheckError
        } = await supabase.from('message_groups').select('id_group').eq('id_project', projectId).eq('id_user', user.id).maybeSingle();
        if (groupCheckError) {
          console.error("Error checking message group:", groupCheckError);
        }
        if (!existingGroup) {
          console.log("No message group found, creating manually...");

          // Create message group manually
          const groupId = crypto.randomUUID();

          // Add entrepreneur to the group
          const {
            error: groupError
          } = await supabase.from('message_groups').insert({
            id_group: groupId,
            id_project: projectId,
            id_user: user.id
          });
          if (groupError) {
            console.error("Error creating message group:", groupError);
          } else {
            console.log("Message group created manually");
          }

          // Add admin users to the group
          const {
            data: adminUsers
          } = await supabase.from('users').select('id_users').eq('role', 'admin');
          if (adminUsers && adminUsers.length > 0) {
            const adminGroupInserts = adminUsers.map(admin => ({
              id_group: groupId,
              id_project: projectId,
              id_user: admin.id_users
            }));
            const {
              error: adminGroupError
            } = await supabase.from('message_groups').insert(adminGroupInserts);
            if (adminGroupError) {
              console.error("Error adding admins to message group:", adminGroupError);
            } else {
              console.log("Admins added to message group");
            }
          }
        } else {
          console.log("Message group already exists");
        }
      } catch (messageError) {
        console.error("Error with message group creation:", messageError);
        // Don't fail the whole project creation for message group issues
        toast.warning("Project created but there may be an issue with messaging setup");
      }

      // Handle file uploads if any were selected
      if (selectedFiles.length > 0) {
        console.log("Uploading files:", selectedFiles.length);
        for (const file of selectedFiles) {
          try {
            // Upload file to storage
            const fileUrl = await uploadFile(file, projectId);
            if (fileUrl) {
              // Add document metadata to database
              await addDocumentToProject(projectId, file.name, 'proposal', fileUrl);
              console.log("File uploaded successfully:", file.name);
            }
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }

      // Reload projects to get the latest data
      await loadProjects();
      toast.success("Project created successfully!");

      // Navigate to the specific project page instead of projects list
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to create project: ${errorMessage}`);
    } finally {
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
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la sélection de pack
        </Button>
      </div>

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
                    <FormLabel>Titre du projet</FormLabel>
                    <FormControl className="bg-tiro-white">
                      <Input placeholder="Entrez le titre de votre projet" {...field} />
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
                    <FormLabel>Description du projet</FormLabel>
                    <FormControl className="bg-tiro-white">
                      <Textarea 
                        placeholder="Décrivez votre projet en détail et vos besoins spécifiques pour ce pack" 
                        className="min-h-[200px]" 
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
                    <FormLabel>Date limite du projet (optionnel)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Select a deadline"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 border p-4 rounded-md bg-gray-50">
                <h3 className="font-medium">Documents initiaux (Optionnel)</h3>
                <p className="text-sm text-muted-foreground">
                Vous pouvez ajouter à ce projet des documents qui aideront l'étudiant à comprendre vos exigences.
                </p>
                
                <div className="space-y-2">
                  <FileUpload 
                    onFileSelect={(file) => {
                      setSelectedFiles(prev => [...prev, file]);
                    }} 
                    buttonText="Ajouter un document" 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip" 
                    maxSize={20} 
                  />
                  
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <Label>Fichiers sélectionnés:</Label>
                      <div className="space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                            <span className="text-sm truncate max-w-[70%]">{file.name}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/projects")} 
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !entrepreneurId} 
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                      Création...
                    </div>
                  ) : "Création du projet"}
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
