import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CreditCard, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface MissingInfo {
  siret: boolean;
  iban: boolean;
}

const profileSchema = z.object({
  siret: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[0-9]{14}$/.test(val), {
      message: "Le numéro de SIRET doit contenir 14 chiffres",
    }),
  iban: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || val.length >= 15, {
      message: "L'IBAN doit contenir au moins 15 caractères",
    }),
});

export const CompleteProfileCard: React.FC = () => {
  const { user } = useAuth();
  const [missingInfo, setMissingInfo] = useState<MissingInfo>({ siret: false, iban: false });
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      siret: "",
      iban: "",
    },
  });

  // Check what information is missing
  useEffect(() => {
    const checkMissingInfo = async () => {
      if (user?.role !== 'student' || !user?.id) return;

      try {
        const { data: studentData, error } = await supabase
          .from('students')
          .select('siret, iban')
          .eq('id_user', user.id)
          .single();

        if (!error && studentData) {
          const missing = {
            siret: !studentData.siret || studentData.siret.trim() === '',
            iban: !studentData.iban || studentData.iban.trim() === ''
          };

          setMissingInfo(missing);
          setIsVisible(missing.siret || missing.iban);

          // Pre-fill form with existing data
          form.setValue('siret', studentData.siret || '');
          form.setValue('iban', studentData.iban || '');
        }
      } catch (error) {
        console.error('Error checking missing profile info:', error);
      }
    };

    checkMissingInfo();
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const updateData: any = {};
      
      // Only update fields that have values
      if (values.siret && values.siret.trim() !== '') {
        updateData.siret = values.siret.trim();
      }
      if (values.iban && values.iban.trim() !== '') {
        updateData.iban = values.iban.trim();
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('students')
          .update(updateData)
          .eq('id_user', user.id);

        if (error) throw error;

        toast.success("Profil mis à jour avec succès !");
        
        // Update missing info state
        const newMissing = { ...missingInfo };
        if (updateData.siret) newMissing.siret = false;
        if (updateData.iban) newMissing.iban = false;
        
        setMissingInfo(newMissing);
        setIsVisible(newMissing.siret || newMissing.iban);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error("Erreur lors de la mise à jour du profil");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible || user?.role !== 'student') {
    return null;
  }

  const missingCount = Object.values(missingInfo).filter(Boolean).length;

  return (
    <Card className="border-l-4 border-l-orange-500 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Complétez votre profil
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            {missingCount} élément{missingCount > 1 ? 's' : ''} manquant{missingCount > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <CardDescription>
          Pour recevoir vos paiements et finaliser vos projets, veuillez compléter les informations suivantes :
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missingInfo.siret && (
                <FormField
                  control={form.control}
                  name="siret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Numéro SIRET
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12345678901234"
                          {...field}
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {missingInfo.iban && (
                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        IBAN
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="FR76 1234 5678 9012 3456 7890 123"
                          {...field}
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};