
import React, { createContext, useContext, useState, useEffect } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User } from "../types";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string, 
    password: string, 
    name: string,
    surname: string, 
    role: "student" | "entrepreneur" | "admin", 
    userData?: Record<string, any>
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

// Mock users for demonstration - we'll keep these until we fully integrate with Supabase
const mockUser: User = {
  id: "1",
  email: "entrepreneur@example.com",
  name: "John Entrepreneur",
  role: "entrepreneur",
  bio: "I'm a startup founder looking for talented students to help with my projects.",
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
};

const mockStudentUser: User = {
  id: "2",
  email: "student@example.com",
  name: "Jane Student",
  role: "student",
  bio: "Design student with a passion for UI/UX",
  skills: ["UI/UX Design", "Figma", "Adobe XD"],
  createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
};

const mockAdminUser: User = {
  id: "3",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
};

// Helper function to transform Supabase user to our app's user format
const transformSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  if (!supabaseUser) return null;
  
  try {
    // Fetch the user's profile from our public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id_users', supabaseUser.id)
      .maybeSingle();
    
    if (userError) {
      console.error('Error fetching user data:', userError);
      return null;
    }
    
    if (!userData) {
      console.error('No user data found');
      return null;
    }
    
    // Map Supabase user data to our app's User type
    return {
      id: userData.id_users,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      createdAt: new Date(userData.created_at),
      // We would fetch additional data based on role if needed
    };
  } catch (error) {
    console.error('Error transforming user:', error);
    return null;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription }} = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        
        if (currentSession?.user) {
          const appUser = await transformSupabaseUser(currentSession.user);
          setUser(appUser);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Get the initial session
    const initializeAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      
      if (initialSession?.user) {
        const appUser = await transformSupabaseUser(initialSession.user);
        setUser(appUser);
      }
      
      setLoading(false);
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // For demo purposes, we'll temporarily keep the mock login method
  // In a real implementation, you would use only Supabase
  const login = async (email: string, password: string) => {
    setLoading(true);

    // Try logging in with Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // For demo, fall back to mock users if Supabase login fails
        if (email === "entrepreneur@example.com" && password === "password") {
          setUser(mockUser);
          toast.success("Logged in successfully (mock user)");
        } else if (email === "student@example.com" && password === "password") {
          setUser(mockStudentUser);
          toast.success("Logged in successfully (mock user)");
        } else if (email === "admin@example.com" && password === "password") {
          setUser(mockAdminUser);
          toast.success("Logged in successfully (mock user)");
        } else {
          toast.error(error.message || "Invalid credentials");
        }
      } else {
        toast.success("Logged in successfully");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    surname: string,
    role: "student" | "entrepreneur" | "admin",
    userData?: Record<string, any>
  ) => {
    setLoading(true);

    try {
      console.log("Registering with data:", { email, name, surname, role, ...userData });
      
      // Register with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            surname,
            role,
            ...userData,
            // Add specific fields for students or entrepreneurs
            ...(role === 'student' ? {
              bio: userData?.bio || "No biography provided.",
              specialty: userData?.specialty || "No formation specified."
            } : {
              companyName: userData?.companyName || "Company name not provided",
              siret: userData?.siret || "00000000000000"
            })
          },
        },
      });

      if (error) {
        console.error("Registration error:", error);
        toast.error(error.message);
      } else {
        console.log("Registration successful:", data);
        toast.success("Account created successfully");
        
        // Note: In real implementation, this would be handled by database triggers
        // This is just for the demo until we fully integrate with Supabase
        const newUser: User = {
          id: data.user?.id || "temp-id",
          email,
          name,
          role,
          createdAt: new Date(),
          ...userData,
        };
        setUser(newUser);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error(error.message);
    } else {
      setUser(null);
      toast.success("Logged out successfully");
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;

    setLoading(true);
    try {
      // Update user metadata in Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...data,
        },
      });

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      // Update our public.users table
      if (user.id) {
        const { error: dbError } = await supabase
          .from('users')
          .update({
            name: data.name,
            // Add other fields to update as needed
          })
          .eq('id_users', user.id);

        if (dbError) {
          toast.error(dbError.message);
          return;
        }
      }

      // Update local state
      setUser({
        ...user,
        ...data,
      });
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
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
