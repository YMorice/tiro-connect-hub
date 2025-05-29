
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
import { ArrowLeft, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { uploadFile, addDocumentToProject } from "@/services/document-service";

interface ProjectPack {
  id: string;
  name: string;
  description: string;
}

interface LocationState {
  selectedPack: ProjectPack;
}

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  packId: z.string().uuid("Invalid pack ID"),
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
  
  // Get the selected pack from location state
  const locationState = location.state as LocationState | undefined;
  const selectedPack = locationState?.selectedPack;
  
  // Fetch entrepreneur ID when component mounts
  useEffect(() => {
    const fetchEntrepreneurId = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('entrepreneurs')
            .select('id_entrepreneur')
            .eq('id_user', user.id)
            .single();
            
          if (data) {
            setEntrepreneurId(data.id_entrepreneur);
          } else if (error) {
            console.error("Error fetching entrepreneur ID:", error);
            toast.error("Failed to fetch your entrepreneur profile");
          }
        } catch (error) {
          console.error("Error fetching entrepreneur ID:", error);
          toast.error("Failed to fetch your entrepreneur profile");
        }
      }
    };
    
    fetchEntrepreneurId();
  }, [user]);
  
  // Redirect to pack selection if no pack is selected
  React.useEffect(() => {
    if (!selectedPack) {
      navigate("/projects/pack-selection");
    }
  }, [selectedPack, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      packId: selectedPack?.id || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user || !entrepreneurId) {
      toast.error("You need to be logged in as an entrepreneur to create a project");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("Creating project with values:", values);
      console.log("Entrepreneur ID:", entrepreneurId);
      
      // Save the project to Supabase - the trigger will handle message group creation
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: values.title,
          description: values.description,
          id_entrepreneur: entrepreneurId,
          id_pack: values.packId,
          status: 'STEP1'
        })
        .select('id_project')
        .single();
        
      if (projectError) {
        console.error("Project creation error:", projectError);
        throw new Error(projectError.message);
      }
      
      console.log("Project created successfully:", projectData);
      const projectId = projectData.id_project;
      
      // Handle file uploads if any were selected
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            // Upload file to storage
            const fileUrl = await uploadFile(file, projectId);
            
            if (fileUrl) {
              // Add document metadata to database
              await addDocumentToProject(
                projectId,
                file.name,
                'proposal',
                fileUrl
              );
            }
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }
      
      // Reload projects to get the latest data
      await loadProjects();
      
      toast.success("Project created successfully");
      
      // Navigate to projects page after successful creation
      navigate("/projects");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(`Failed to create project: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedPack) {
    return null; // Will redirect to pack selection
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto pb-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/projects/pack-selection")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to pack selection
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Project</CardTitle>
            <CardDescription>
              Provide the details for your new project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="packId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Pack</FormLabel>
                      <Select 
                        defaultValue={field.value} 
                        onValueChange={field.onChange}
                        disabled
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pack" />
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
                      <FormLabel>Project Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter project title" 
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
                      <FormLabel>Project Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your project in detail and your specific needs for this pack" 
                          className="min-h-[200px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 border p-4 rounded-md bg-gray-50">
                  <h3 className="font-medium">Initial Documents (Optional)</h3>
                  <p className="text-sm text-muted-foreground">
                    You can add documents to this project that will help the student understand your requirements.
                  </p>
                  
                  <div className="space-y-2">
                    <Label>Project Documents</Label>
                    <FileUpload 
                      onFileSelect={(file) => {
                        setSelectedFiles(prev => [...prev, file]);
                      }}
                      buttonText="Add Document"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                      maxSize={20}
                    />
                    
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <Label>Selected Files:</Label>
                        <div className="space-y-1">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                              <span className="text-sm">{file.name}</span>
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
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-tiro-purple hover:bg-tiro-purple/90 min-w-[140px]"
                    disabled={isSubmitting || !entrepreneurId}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                        Creating...
                      </div>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NewProject;
