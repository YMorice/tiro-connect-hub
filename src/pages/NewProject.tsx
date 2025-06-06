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
import { ArrowLeft, Trash2, CalendarIcon } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { uploadFile, addDocumentToProject } from "@/services/document-service";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  deadline: z.date().optional()
});
type FormValues = z.infer<typeof formSchema>;
const NewProject = () => {
  const {
    loadProjects
  } = useProjects();
  const {
    user
  } = useAuth();
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
              toast.error("No entrepreneur profile found. Please complete your profile first.");
            } else {
              toast.error("Failed to fetch your entrepreneur profile");
            }
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
      toast.error("You need to be logged in to create a project");
      return;
    }
    if (!entrepreneurId) {
      toast.error("No entrepreneur profile found. Please complete your profile first.");
      return;
    }
    setIsSubmitting(true);
    try {
      console.log("Creating project with values:", values);
      console.log("Entrepreneur ID:", entrepreneurId);
      console.log("User ID:", user.id);

      // Create the project with proper error handling
      const {
        data: projectData,
        error: projectError
      } = await supabase.from('projects').insert({
        title: values.title,
        description: values.description,
        id_entrepreneur: entrepreneurId,
        id_pack: values.packId,
        status: 'STEP1',
        deadline: values.deadline ? values.deadline.toISOString().split('T')[0] : null
      }).select('id_project').single();
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        const {
          data: existingGroup,
          error: groupCheckError
        } = await supabase.from('message_groups').select('id_group').eq('id_project', projectId).eq('id_user', user.id).maybeSingle();
        if (groupCheckError) {
          console.error("Error checking message group:", groupCheckError);
        }
        if (!existingGroup) {
          console.log("No message group found, creating manually...");
          const groupId = crypto.randomUUID();
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
        toast.warning("Project created but there may be an issue with messaging setup");
      }
      if (selectedFiles.length > 0) {
        console.log("Uploading files:", selectedFiles.length);
        for (const file of selectedFiles) {
          try {
            const fileUrl = await uploadFile(file, projectId);
            if (fileUrl) {
              await addDocumentToProject(projectId, file.name, 'proposal', fileUrl);
              console.log("File uploaded successfully:", file.name);
            }
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }
      await loadProjects();
      toast.success("Project created successfully!");
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
    return null;
  }
  return <AppLayout>
      <div className="max-w-3xl mx-auto pb-8 px-4">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/pack-selection")} className="flex items-center text-muted-foreground hover:text-foreground">
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
            {!entrepreneurId && <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800">
                  Loading your entrepreneur profile...
                </p>
              </div>}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="packId" render={({
                field
              }) => <FormItem>
                      <FormLabel>Project Pack</FormLabel>
                      <Select defaultValue={field.value} onValueChange={field.onChange} disabled>
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
                    </FormItem>} />
                
                <FormField control={form.control} name="title" render={({
                field
              }) => <FormItem>
                      <FormLabel>Project Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="description" render={({
                field
              }) => <FormItem>
                      <FormLabel>Project Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your project in detail and your specific needs for this pack" className="min-h-[200px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="deadline" render={({
                field
              }) => <FormItem className="flex flex-col">
                      <FormLabel>Project Deadline (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a deadline date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={date => date < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>} />

                <div className="space-y-4 border p-4 rounded-md bg-gray-50">
                  <h3 className="font-medium">Initial Documents (Optional)</h3>
                  <p className="text-sm text-muted-foreground">
                    You can add documents to this project that will help the student understand your requirements.
                  </p>
                  
                  <div className="space-y-2">
                    <Label>Project Documents</Label>
                    <FileUpload onFileSelect={file => {
                    setSelectedFiles(prev => [...prev, file]);
                  }} buttonText="Add Document" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip" maxSize={20} />
                    
                    {selectedFiles.length > 0 && <div className="mt-2 space-y-2">
                        <Label>Selected Files:</Label>
                        <div className="space-y-1">
                          {selectedFiles.map((file, index) => <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                              <span className="text-sm">{file.name}</span>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>)}
                        </div>
                      </div>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate("/projects")} disabled={isSubmitting} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !entrepreneurId} className="">
                    {isSubmitting ? <div className="flex items-center justify-center">
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                        Creating...
                      </div> : "Create Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>;
};
export default NewProject;