
import React from "react";
import { useNavigate } from "react-router-dom";
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

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type FormValues = z.infer<typeof formSchema>;

const NewProject = () => {
  const { createProject } = useProjects();
  const { user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!user) return;
    
    createProject({
      title: values.title,
      description: values.description,
      ownerId: user.id,
      status: "draft",
    });
    
    navigate("/projects");
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
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
                          placeholder="Describe your project in detail" 
                          className="min-h-[200px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
