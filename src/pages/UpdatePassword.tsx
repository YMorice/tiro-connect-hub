import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const formSchema = z
  .object({
    email: z.string().email("Adresse email invalide"),
    token: z.string().min(6, "Le code doit contenir 6 caractères").max(6, "Le code doit contenir 6 caractères"),
    password: z.string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
      .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
      .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      email: "",
      token: "", 
      password: "", 
      confirmPassword: "" 
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      console.log("Attempting password reset with token");
      
      // Utiliser verifyOtp pour valider le token (crée une session temporaire)
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: values.email,
        token: values.token,
        type: 'recovery',
      });

      if (verifyError) {
        console.error("Token verification error:", verifyError);
        toast.error(verifyError.message || "Code invalide ou expiré");
        return;
      }

      console.log("Token verified successfully, updating password");
      
      // Maintenant mettre à jour le mot de passe (la session temporaire est active)
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: values.password 
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        // Gestion des erreurs spécifiques de validation de mot de passe
        if (updateError.message?.includes("Password should be at least")) {
          toast.error("Le mot de passe ne respecte pas les exigences de sécurité");
        } else if (updateError.message?.includes("weak password")) {
          toast.error("Le mot de passe est trop faible. Utilisez au moins 8 caractères avec majuscules, minuscules, chiffres et caractères spéciaux.");
        } else {
          toast.error(updateError.message || "Échec de la mise à jour du mot de passe");
        }
      } else {
        console.log("Password updated successfully");
        // Déconnexion pour nettoyer la session temporaire
        await supabase.auth.signOut();
        toast.success("Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.");
        navigate("/login");
      }
    } catch (error) {
      console.error("Password reset exception:", error);
      toast.error("Échec de la réinitialisation du mot de passe");
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
              <img
                src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png"
                alt="Logo Tiro"
                className="h-14"
              />
            </div>
            <CardDescription>Entrez le code reçu par email et votre nouveau mot de passe</CardDescription>
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
                        <Input
                          type="email"
                          placeholder="Votre adresse email"
                          {...field}
                          disabled={isSubmitting}
                          className="bg-tiro-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code de réinitialisation</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Code à 6 chiffres"
                          {...field}
                          disabled={isSubmitting}
                          className="bg-tiro-white font-mono text-center text-lg tracking-wider"
                          maxLength={6}
                        />
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
                      <FormLabel>Nouveau mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Entrez votre nouveau mot de passe"
                            {...field}
                            disabled={isSubmitting}
                            className="bg-tiro-white pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword((v) => !v)}
                            disabled={isSubmitting}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        8 caractères minimum avec au moins une majuscule, une minuscule, un chiffre et un caractère spécial
                      </FormDescription>
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
                            className="bg-tiro-white pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            disabled={isSubmitting}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  asChild
                >
                  <Link to="/login" className="flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la connexion
                  </Link>
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}