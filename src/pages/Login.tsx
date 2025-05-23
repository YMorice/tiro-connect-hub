
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/context/auth-context";
import { toast } from "@/components/ui/sonner";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type FormValues = z.infer<typeof formSchema>;

const Login = () => {
  const {
    login,
    loading,
    user,
    session
  } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Redirect if user is already logged in - check for both user and session
  useEffect(() => {
    if (user && session) {
      console.log("User and session found, redirecting to dashboard");
      navigate("/dashboard", {
        replace: true
      });
    } else if (session && !user) {
      console.log("Session found but no user data, attempting to fix state");
      // The auth context will handle this case with the onAuthStateChange
    }
  }, [user, session, navigate]);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      console.log("Login form submitted:", values.email);
      const { user, error } = await login(values.email, values.password);

      if (error) {
        toast.error(error);
        setIsSubmitting(false);
        return;
      }

      // We won't navigate here - the useEffect will handle redirection
      // when the auth state changes after successful login
    } catch (error) {
      console.error("Login error in form handler:", error);
      toast.error("Failed to sign in. Please check your credentials and try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" alt="Tiro Logo" className="h-10" />
            </div>
            <CardDescription>
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField 
                  control={form.control} 
                  name="email" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="example@email.com" {...field} autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="password" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="******" {...field} autoComplete="current-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <Button 
                  type="submit" 
                  className="w-full bg-tiro-primary hover:bg-tiro-primary/90 text-white" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center">
              <span className="text-muted-foreground">New to Tiro? </span>
              <Link to="/register" className="text-tiro-primary hover:underline">
                Create an account
              </Link>
            </div>
          </CardFooter>
        </Card>
        <div className="mt-4 text-center text-sm text-muted-foreground">
        </div>
      </div>
    </div>
  );
};

export default Login;
