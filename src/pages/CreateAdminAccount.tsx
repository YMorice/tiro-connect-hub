
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import AppLayout from "@/components/AppLayout";

const CreateAdminAccount = () => {
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const adminEmail = "contact@tiro.agency";

  // Check if admin account already exists
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id_users')
          .eq('email', adminEmail)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) throw error;
        setAdminExists(!!data);
      } catch (error) {
        console.error("Erreur lors de la vérification du compte administrateur :", error);
      }
    };

    checkAdminExists();
  }, []);

  const createAdminAccount = async () => {
    setLoading(true);

    try {
      // Generate a random password
      const password = Math.random().toString(36).slice(-12);
      
      // Register the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: password,
        options: {
          data: {
            name: "Admin",
            surname: "Tiro",
            role: "admin"
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // The handle_new_user trigger should take care of creating the user record
        toast.success("Compte administrateur créé avec succès !");
        toast.info(`Mot de passe temporaire : ${password}`);
        setAdminExists(true);
      }
    } catch (error: any) {
      console.error("Erreur lors de la création du compte administrateur :", error);
      toast.error(error.message || "Échec de la création du compte administrateur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Création du compte administrateur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              {adminExists ? (
                <p className="text-green-600">Un compte administrateur avec l'email {adminEmail} existe déjà.</p>
              ) : (
                <>
                  <p className="mb-4">
                    Créer un compte administrateur avec l'adresse email {adminEmail}
                  </p>
                  <Button 
                    onClick={createAdminAccount} 
                    disabled={loading || adminExists}
                    className="bg-tiro-purple hover:bg-tiro-purple/90"
                  >
                    {loading ? "Création..." : "Créer le compte administrateur"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreateAdminAccount;
