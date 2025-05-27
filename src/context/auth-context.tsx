
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
            // For token refresh and other events, use basic user data
            setUser(session.user as ExtendedUser);
            if (mounted) setLoading(false);
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
      toast.success("Welcome back!");
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Failed to sign in");
      throw error;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message || "Failed to sign in");
        return { error };
      }
      toast.success("Welcome back!");
      return {};
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to sign in");
      return { error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, userData: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      if (error) throw error;
      toast.success("Account created successfully!");
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(error.message || "Failed to create account");
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, userData: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      if (error) {
        toast.error(error.message || "Failed to create account");
        return { error };
      }
      toast.success("Account created successfully!");
      return {};
    } catch (error: any) {
      console.error("Register error:", error);
      toast.error(error.message || "Failed to create account");
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSession(null);
      setUser(null);
      
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error(error.message || "Failed to sign out");
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSession(null);
      setUser(null);
      
      toast.success("Logged out successfully");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.message || "Failed to log out");
      throw error;
    }
  }, []);

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
