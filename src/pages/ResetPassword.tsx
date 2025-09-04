import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Adresse email invalide")
});

type FormValues = z.infer<typeof formSchema>;

const ResetPassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      console.log("Sending password reset email to:", values.email);
      
      // Use the correct redirect URL for password reset - must match Supabase config exactly
      const redirectUrl = `${window.location.origin}/update-password`;
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo: redirectUrl });
      console.log("resetPasswordForEmail result:", { data, error });
      
      if (error) {
        console.error("Reset password error:", error);
        toast.error(error.message || "Échec de l'envoi de l'email de réinitialisation");
      } else {
        console.log("Reset email sent successfully");
        setEmailSent(true);
        toast.success("Email de réinitialisation du mot de passe envoyé");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Échec de l'envoi de l'email de réinitialisation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <img src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" alt="Logo Tiro" className="h-14" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-left">
              
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Nous avons envoyé un lien de réinitialisation du mot de passe à <strong className="text-foreground">{form.getValues("email")}</strong>
                </p>
                <p>
                  Veuillez cliquer sur le lien dans l'email pour réinitialiser votre mot de passe.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                  <p className="text-amber-800">
                    <strong>Important :</strong> L'email peut prendre quelques minutes à arriver. 
                    N'oubliez pas de vérifier votre dossier spam si vous ne le voyez pas dans votre boîte de réception.
                  </p>
                </div>
              </div>
              
              <Button 
                asChild
                className="w-full bg-tiro-primary hover:bg-tiro-primary/90 text-white"
              >
                <Link to="/login">
                  Retour à la connexion
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" alt="Logo Tiro" className="h-14" />
            </div>
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
                          placeholder="Entrez votre adresse email" 
                          {...field} 
                          autoComplete="email" 
                          disabled={isSubmitting}
                          className = "bg-tiro-white"
                        />
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
                  {isSubmitting ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
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
};

export default ResetPassword;
