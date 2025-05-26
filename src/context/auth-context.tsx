
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

  useEffect(() => {
    let mounted = true;
    
    console.log("Loading initial session...");
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("Auth state changed:", event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          setSession(session);
          
          // Fetch user profile data only once when user signs in
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            try {
              console.log("User signed in, fetching profile...");
              console.log("Fetching user profile for:", session.user.id);
              
              const { data: userProfile, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id_users', session.user.id)
                .single();

              if (userError) {
                console.error('Error fetching user profile:', userError);
                setUser(session.user);
                setLoading(false);
                return;
              }

              if (userProfile) {
                // Fetch additional bio from students or entrepreneurs table based on role
                let bio = '';
                if (userProfile.role === 'student') {
                  const { data: studentData } = await supabase
                    .from('students')
                    .select('biography')
                    .eq('id_user', session.user.id)
                    .single();
                  bio = studentData?.biography || '';
                }

                const enhancedUser: ExtendedUser = {
                  ...session.user,
                  role: userProfile.role,
                  name: userProfile.name,
                  surname: userProfile.surname,
                  phone: userProfile.phone,
                  pp_link: userProfile.pp_link,
                  avatar: userProfile.pp_link,
                  bio: bio
                };
                setUser(enhancedUser);
              } else {
                setUser(session.user);
              }
            } catch (error) {
              console.error("Error in auth state change:", error);
              setUser(session.user);
            }
          } else {
            setUser(session.user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session) {
        setSession(session);
        // The onAuthStateChange will handle the profile fetch
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Failed to sign in");
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message || "Failed to sign in");
        setLoading(false);
        return { error };
      }
      toast.success("Welcome back!");
      return {};
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to sign in");
      setLoading(false);
      return { error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, userData: any) => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      if (error) {
        toast.error(error.message || "Failed to create account");
        setLoading(false);
        return { error };
      }
      toast.success("Account created successfully!");
      return {};
    } catch (error: any) {
      console.error("Register error:", error);
      toast.error(error.message || "Failed to create account");
      setLoading(false);
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear state immediately
      setSession(null);
      setUser(null);
      setLoading(false);
      
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error(error.message || "Failed to sign out");
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear state immediately
      setSession(null);
      setUser(null);
      setLoading(false);
      
      toast.success("Logged out successfully");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.message || "Failed to log out");
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (userData: any) => {
    if (!user) throw new Error("No user logged in");
    
    try {
      // Update the user state optimistically
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
