
import React, { createContext, useContext, useState, useEffect } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User } from "../types";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null; // Add session to the context type
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
    console.log("Fetching user data for ID:", supabaseUser.id);
    
    // Fetch the user's profile from our public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id_users', supabaseUser.id)
      .single();
    
    if (userError) {
      console.error('Error fetching user data:', userError);
      
      // Fall back to mock users for demonstration
      if (supabaseUser.email === "entrepreneur@example.com") {
        console.log("Using mock entrepreneur user");
        return mockUser;
      } else if (supabaseUser.email === "student@example.com") {
        console.log("Using mock student user");
        return mockStudentUser;
      } else if (supabaseUser.email === "admin@example.com") {
        console.log("Using mock admin user");
        return mockAdminUser;
      }
      
      // If no mock user matches, create a basic user object from auth data
      console.log("Creating user from auth metadata:", supabaseUser.user_metadata);
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name: supabaseUser.user_metadata?.name || 
              (supabaseUser.user_metadata?.first_name && supabaseUser.user_metadata?.last_name) ? 
              `${supabaseUser.user_metadata.first_name} ${supabaseUser.user_metadata.last_name}` : 
              "New User",
        role: (supabaseUser.user_metadata?.role as "student" | "entrepreneur" | "admin") || "entrepreneur",
        createdAt: new Date(supabaseUser.created_at || Date.now())
      };
    }
    
    console.log("User data found:", userData);
    
    // Map Supabase user data to our app's User type
    return {
      id: userData.id_users,
      email: userData.email,
      name: userData.name || "New User",
      role: userData.role || "entrepreneur",
      createdAt: new Date(userData.created_at || Date.now()),
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
    console.log("Initializing auth state");
    
    // Set up auth state listener FIRST - this is crucial for correct auth flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          console.log("User from auth change:", currentSession.user.id);
          
          // Important: Only synchronous state updates in the callback
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(async () => {
            const appUser = await transformSupabaseUser(currentSession.user);
            console.log("Setting user from auth change:", appUser);
            setUser(appUser);
          }, 0);
        } else {
          console.log("Auth change: No user");
          setUser(null);
        }
        
        setLoading(false);
      }
    );
    
    // THEN check for existing session
    const initializeAuth = async () => {
      console.log("Checking for existing session");
      
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log("Initial session:", initialSession ? "Found" : "Not found");
        
        setSession(initialSession);
        
        if (initialSession?.user) {
          console.log("User found in session, transforming user data");
          const appUser = await transformSupabaseUser(initialSession.user);
          console.log("Transformed user:", appUser);
          setUser(appUser);
        } else {
          console.log("No user in session");
          setUser(null);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      console.log("Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  // For demo purposes, we'll temporarily keep the mock login method
  // In a real implementation, you would use only Supabase
  const login = async (email: string, password: string) => {
    setLoading(true);

    console.log("Attempting login for:", email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Supabase login error:", error);
        
        // For demo, fall back to mock users if Supabase login fails
        if (email === "entrepreneur@example.com") {
          console.log("Using mock entrepreneur login");
          setUser(mockUser);
          setSession({} as Session); // Add a mock session
          toast.success("Logged in successfully (mock user)");
          return;
        } else if (email === "student@example.com") {
          console.log("Using mock student login");
          setUser(mockStudentUser);
          setSession({} as Session); // Add a mock session
          toast.success("Logged in successfully (mock user)");
          return;
        } else if (email === "admin@example.com") {
          console.log("Using mock admin login");
          setUser(mockAdminUser);
          setSession({} as Session); // Add a mock session
          toast.success("Logged in successfully (mock user)");
          return;
        }
        
        toast.error(error.message || "Invalid credentials");
        setLoading(false);
        return;
      }
      
      console.log("Login successful, session:", data.session ? "exists" : "missing");
      
      // The session will be set by onAuthStateChange
      // The user will be transformed by onAuthStateChange
      toast.success("Logged in successfully");
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
      
      // Register with Supabase - we'll require email confirmation for new accounts
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            surname,
            role,
            // Add specific fields for students or entrepreneurs
            ...(role === 'student' ? {
              bio: userData?.bio || "No biography provided.",
              specialty: userData?.specialty || "No formation specified."
            } : {
              companyName: userData?.companyName || "Company name not provided",
              siret: userData?.siret || "00000000000000"
            })
          },
          emailRedirectTo: window.location.origin + '/login'
        },
      });

      if (error) {
        console.error("Registration error:", error);
        toast.error(error.message);
      } else {
        console.log("Registration successful:", data);
        
        // Check if email confirmation is required
        if (data.session) {
          toast.success("Account created successfully! You are now logged in.");
          
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
          setSession(data.session);
        } else {
          // No session means email confirmation is required
          toast.success("Account created successfully! Please check your email to verify your account.");
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log("Logging out");
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Logout error:", error);
      toast.error(error.message);
    } else {
      console.log("Logout successful");
      setUser(null);
      setSession(null);
      toast.success("Logged out successfully");
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) {
      console.error("Cannot update profile: no user logged in");
      return;
    }

    setLoading(true);
    try {
      console.log("Updating profile:", data);
      
      // Update user metadata in Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...data,
        },
      });

      if (updateError) {
        console.error("Profile update error (auth):", updateError);
        toast.error(updateError.message);
        return;
      }

      // Update our public.users table
      if (user.id) {
        console.log("Updating user in database:", user.id);
        
        const { error: dbError } = await supabase
          .from('users')
          .update({
            name: data.name,
            // Add other fields to update as needed
          })
          .eq('id_users', user.id);

        if (dbError) {
          console.error("Profile update error (db):", dbError);
          toast.error(dbError.message);
          return;
        }
      }

      // Update local state
      setUser({
        ...user,
        ...data,
      });
      
      console.log("Profile updated successfully");
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
        session, // Add session to the context
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
