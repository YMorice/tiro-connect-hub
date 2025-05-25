
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/context/auth-context";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type FormValues = z.infer<typeof formSchema>;

const Login = () => {
  const { login, user, session, loading } = useAuth();
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
    if (user && session && !loading) {
      console.log("User and session found, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [user, session, navigate, loading]);

  const onSubmit = async (values: FormValues) => {
    // Prevent double submission
    if (isSubmitting || loading) {
      console.log("Login already in progress, ignoring submission");
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Login form submitted:", values.email);
      
      const result = await login(values.email, values.password);
      
      if (result.error) {
        console.error("Login failed:", result.error);
        // Reset the submitting state on error
        setIsSubmitting(false);
      } else {
        console.log("Login successful");
        // Don't reset isSubmitting here - let the redirect handle it
        // The useEffect will redirect us when user/session state updates
      }
    } catch (error) {
      console.error("Login error in form handler:", error);
      setIsSubmitting(false);
    }
  };

  // Reset submitting state when component unmounts or when there's an auth state change
  useEffect(() => {
    return () => {
      setIsSubmitting(false);
    };
  }, []);

  // Reset submitting state if we're not loading and we have an auth state
  useEffect(() => {
    if (!loading && (user || !user)) {
      // Reset submitting state when auth state stabilizes
      setIsSubmitting(false);
    }
  }, [loading, user]);

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
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting || loading ? "Signing in..." : "Sign In"}
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
      </div>
    </div>
  );
};

export default Login;
