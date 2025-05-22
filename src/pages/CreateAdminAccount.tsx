
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
        console.error("Error checking admin account:", error);
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
        toast.success("Admin account created successfully!");
        toast.info(`Temporary password: ${password}`);
        setAdminExists(true);
      }
    } catch (error: any) {
      console.error("Error creating admin account:", error);
      toast.error(error.message || "Failed to create admin account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Admin Account Creation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              {adminExists ? (
                <p className="text-green-600">Admin account with email {adminEmail} already exists.</p>
              ) : (
                <>
                  <p className="mb-4">
                    Create an admin account with the email address {adminEmail}
                  </p>
                  <Button 
                    onClick={createAdminAccount} 
                    disabled={loading || adminExists}
                    className="bg-tiro-purple hover:bg-tiro-purple/90"
                  >
                    {loading ? "Creating..." : "Create Admin Account"}
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
