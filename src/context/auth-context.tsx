import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";

interface ExtendedUser extends User {
  role?: string;
  name?: string;
  surname?: string;
  phone?: string;
  pp_link?: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error?: any }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData: any) => Promise<{ error?: any }>;
  updateProfile: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log("Fetching user profile for:", userId);
      
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id_users', userId)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        return null;
      }

      if (userProfile) {
        // Only fetch bio for students to avoid unnecessary queries
        let bio = '';
        if (userProfile.role === 'student') {
          const { data: studentData } = await supabase
            .from('students')
            .select('biography')
            .eq('id_user', userId)
            .single();
          bio = studentData?.biography || '';
        }

        return {
          role: userProfile.role,
          name: userProfile.name,
          surname: userProfile.surname,
          phone: userProfile.phone,
          pp_link: userProfile.pp_link,
          avatar: userProfile.pp_link,
          bio: bio
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    console.log("Loading initial session...");
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("Auth state changed:", event, session?.user?.id);
        
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          if (mounted) setLoading(false);
          return;
        }
        
        // Set session immediately for faster UI updates
        setSession(session);
        
        if (session.user) {
          // For initial session and sign in, fetch profile data
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            // Defer profile fetching to avoid blocking the auth flow
            setTimeout(async () => {
              if (!mounted) return;
              
              const profileData = await fetchUserProfile(session.user.id);
              
              if (mounted) {
                const enhancedUser: ExtendedUser = {
                  ...session.user,
                  ...profileData
                };
                setUser(enhancedUser);
                setLoading(false);
              }
            }, 0);
          } else {
            // For token refresh and other events, still fetch profile data for security
            setTimeout(async () => {
              if (!mounted) return;
              
              const profileData = await fetchUserProfile(session.user.id);
              
              if (mounted) {
                const enhancedUser: ExtendedUser = {
                  ...session.user,
                  ...profileData
                };
                setUser(enhancedUser);
                setLoading(false);
              }
            }, 0);
          }
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (!session) {
        setLoading(false);
      }
      // If session exists, the onAuthStateChange will handle it
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Inscription réussie");
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Problème lors de l'inscription");
      throw error;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message || "Problème lors de la connexion");
        return { error };
      }
      toast.success("Connexion réussie");
      return {};
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Problème lors de la connexion");
      return { error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, userData: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
      toast.success("Compte créé avec succès !");
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(error.message || "Problème lors de la création du compte");
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, userData: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) {
        toast.error(error.message || "Problème lors de la création du compte");
        return { error };
      }
      toast.success("Compte créé avec succès !");
      return {};
    } catch (error: any) {
      console.error("Register error:", error);
      toast.error(error.message || "Problème lors de la création du compte");
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    let hardError = false;
    try {
      // Vérifier la session courante
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Session active côté serveur: déconnexion globale
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error && error.name !== 'AuthSessionMissingError') {
          hardError = true;
          throw error;
        }
      } else {
        // Pas de session active: nettoyer localement pour éviter le 403
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch (error: any) {
      if (error?.name !== 'AuthSessionMissingError') {
        console.error("Erreur lors de la déconnexion:", error);
        toast.error(error.message || "Erreur lors de la déconnexion");
        throw error;
      }
      // Ignorer AuthSessionMissingError et continuer le nettoyage
    } finally {
      // Toujours nettoyer l'état local
      setSession(null);
      setUser(null);
      if (!hardError) {
        toast.success("Déconnexion réussie");
      }
    }
  }, []);

  const logout = useCallback(async () => {
    // Déléguer à signOut pour conserver une logique unique
    await signOut();
  }, [signOut]);

  const updateProfile = useCallback(async (userData: any) => {
    if (!user) throw new Error("No user logged in");
    
    try {
      const updatedUser: ExtendedUser = {
        ...user,
        ...userData,
        avatar: userData.avatar || user.avatar
      };
      setUser(updatedUser);
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Update profile error:", error);
      toast.error(error.message || "Failed to update profile");
      throw error;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      login,
      logout,
      register,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};