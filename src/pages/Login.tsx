
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
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères")
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

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && session && !loading) {
      console.log("User authenticated, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [user, session, loading, navigate]);

  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      console.log("Starting login for:", values.email);
      
      const result = await login(values.email, values.password);
      
      if (result.error) {
        console.error("Login failed:", result.error);
      } else {
        console.log("Login successful, waiting for redirect...");
      }
    } catch (error) {
      console.error("Login error in form handler:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show a minimal loading state only for the initial auth check
  if (loading && !user && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiro-primary mx-auto mb-4"></div>
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // Don't show login form if user is already authenticated
  if (user && session) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 text-center pb-4">
            <div className="flex justify-center mb-1">
              <img 
                src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" 
                alt="Logo Tiro" 
                className="h-14" 
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField 
                  control={form.control} 
                  name="email" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="exemple@email.com" 
                          {...field} 
                          autoComplete="email" 
                          disabled={isSubmitting}
                          className="text-sm h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="password" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Mot de passe</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="******" 
                          {...field} 
                          autoComplete="current-password" 
                          disabled={isSubmitting}
                          className="text-sm h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} 
                />
                <div className="text-right">
                  <Link 
                    to="/reset-password" 
                    className="text-xs text-tiro-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-tiro-primary hover:bg-tiro-primary/90 text-white text-sm h-10" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 p-4 pt-0">
            <div className="text-xs text-center">
              <span className="text-muted-foreground">Nouveau sur Tiro ? </span>
              <Link to="/register" className="text-tiro-primary hover:underline">
                Créer un compte
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
