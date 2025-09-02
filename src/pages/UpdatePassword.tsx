
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const UpdatePassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Vérifier d'abord si l'utilisateur est déjà connecté
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("User already authenticated, ready for password update");
          return;
        }

        console.log("Current URL:", window.location.href);
        console.log("Search params:", Object.fromEntries(searchParams.entries()));
        console.log("Hash:", window.location.hash);

        // Gérer le flow de récupération de mot de passe avec code
        const code = searchParams.get("code");
        if (code) {
          console.log("Found code in URL params, attempting to exchange for session");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Error exchanging code for session:", error);
            throw error;
          }
          console.log("Successfully exchanged code for session:", data);
          // Nettoie l'URL après échange réussi
          window.history.replaceState({}, document.title, "/update-password");
          return;
        }

        // Gérer les tokens dans les paramètres URL
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");
        
        if (accessToken && refreshToken) {
          console.log("Found tokens in URL params, setting session");
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error("Error setting session with tokens:", error);
            throw error;
          }
          console.log("Successfully set session with tokens:", data);
          // Nettoie l'URL après échange réussi
          window.history.replaceState({}, document.title, "/update-password");
          return;
        }

        // Gérer les tokens dans le hash
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.replace("#", ""));
          const hashAccessToken = hashParams.get("access_token");
          const hashRefreshToken = hashParams.get("refresh_token");
          
          if (hashAccessToken && hashRefreshToken) {
            console.log("Found tokens in hash, setting session");
            const { data, error } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken,
            });
            if (error) {
              console.error("Error setting session with hash tokens:", error);
              throw error;
            }
            console.log("Successfully set session with hash tokens:", data);
            // Nettoie l'URL après échange réussi
            window.history.replaceState({}, document.title, "/update-password");
            return;
          }
        }

        console.log("No valid authentication tokens found");
        toast.error("Lien de réinitialisation invalide ou expiré");
        navigate("/reset-password");
      } catch (err) {
        console.error("Error in password reset flow:", err);
        toast.error("Lien de réinitialisation invalide ou expiré. Veuillez demander un nouveau lien.");
        navigate("/reset-password");
      }
    };

    handlePasswordReset();
  }, [searchParams, navigate]);

  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      console.log("Updating password...");
      
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });
      
      if (error) {
        console.error("Password update error:", error);
        toast.error(error.message || "Échec de la mise à jour du mot de passe");
      } else {
        console.log("Password updated successfully");
        toast.success("Mot de passe mis à jour avec succès !");
        navigate("/login");
      }
    } catch (error) {
      console.error("Password update error:", error);
      toast.error("Échec de la mise à jour du mot de passe");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" alt="Logo Tiro" className="h-10" />
            </div>
            <CardDescription>
              Définissez votre nouveau mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField 
                  control={form.control} 
                  name="password" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Entrez votre nouveau mot de passe" 
                            {...field} 
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isSubmitting}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="confirmPassword" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirmez votre nouveau mot de passe" 
                            {...field} 
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isSubmitting}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
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
                  {isSubmitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UpdatePassword;
