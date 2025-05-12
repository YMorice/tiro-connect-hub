
import React from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const studentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().optional(),
  skills: z.string().optional(),
});

const entrepreneurSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().optional(),
});

const Profile = () => {
  const { user, updateProfile } = useAuth();
  
  const isStudent = user?.role === "student";
  const schema = isStudent ? studentSchema : entrepreneurSchema;
  type FormValues = z.infer<typeof schema>;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      bio: user?.bio || "",
      ...(isStudent && { skills: user?.skills?.join(", ") || "" }),
    },
  });

  const onSubmit = (values: FormValues) => {
    updateProfile({
      name: values.name,
      bio: values.bio,
      ...(isStudent && {
        skills: values.skills ? values.skills.split(",").map(s => s.trim()) : [],
      }),
    });
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormDescription>
                        Email cannot be changed
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Tell us about yourself"
                          className="min-h-[150px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {isStudent && (
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="UI Design, HTML/CSS, JavaScript (separated by commas)"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter your skills separated by commas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <Button 
                  type="submit" 
                  className="bg-tiro-purple hover:bg-tiro-purple/90"
                >
                  Update Profile
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label className="text-muted-foreground">Account Type</Label>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Member Since</Label>
                <p className="font-medium">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
