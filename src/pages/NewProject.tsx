
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProjects } from "@/context/project-context";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";

// Define the form schema with zod
const projectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100, "Title must be less than 100 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
});

const NewProject = () => {
  const { user } = useAuth();
  const { createProject } = useProjects();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define the form with useForm and zod resolver
  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof projectSchema>) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // Get entrepreneur ID from user ID
      const { data: entrepreneurData, error: entrepreneurError } = await supabase
        .from('entrepreneurs')
        .select('id_entrepreneur')
        .eq('id_user', user.id)
        .single();
        
      if (entrepreneurError) {
        throw entrepreneurError;
      }
      
      // Create project in the database
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: data.title,
          description: data.description,
          status: "STEP1", // Use new status type
          id_entrepreneur: entrepreneurData.id_entrepreneur,
        })
        .select();
        
      if (projectError) {
        throw projectError;
      }
      
      // Create local project
      if (projectData && projectData.length > 0) {
        createProject({
          id: projectData[0].id_project,
          title: data.title,
          description: data.description,
          ownerId: user.id,
          status: "STEP1", // Use new status type
        });
      }
      
      toast.success("Project created successfully");
      navigate("/projects");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Create a New Project</h1>
        <p className="text-muted-foreground">
          Fill out the form below to create a new project. You can add more details later.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project title" {...field} />
                  </FormControl>
                  <FormDescription>
                    A clear, descriptive title for your project.
                  </FormDescription>
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
                      placeholder="Describe your project in detail..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a detailed description of your project, including goals and requirements.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/projects")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
};

export default NewProject;
