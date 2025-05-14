
import React, { useState } from "react";
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
import { ArrowLeft } from "lucide-react";
import FileUpload from "@/components/FileUpload";

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
  const { createProject, addDocument } = useProjects();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Get the selected pack from location state
  const locationState = location.state as LocationState | undefined;
  const selectedPack = locationState?.selectedPack;
  
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

  const onSubmit = (values: FormValues) => {
    if (!user) return;
    
    const newProject = {
      title: values.title,
      description: values.description,
      ownerId: user.id,
      status: "draft",
      packId: values.packId,
    };
    
    createProject(newProject);
    
    // Get the newly created project (assuming it's the last one added)
    const projectId = String(form.getValues().packId.length + 1); // This is a simplification
    
    // Add documents if any were selected
    selectedFiles.forEach(file => {
      addDocument(projectId, {}, file);
    });
    
    navigate("/projects");
  };

  if (!selectedPack) {
    return null; // Will redirect to pack selection
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
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

                <div className="flex items-center justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => navigate("/projects")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-tiro-purple hover:bg-tiro-purple/90"
                  >
                    Create Project
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
