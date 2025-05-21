import React, { createContext, useContext, useState, useEffect } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User } from "../types";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
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

// Mock users for demonstration - we'll keep these for fallback purposes
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
      
      // Only use mock users if they match the exact email
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
      
      // Try to create a user object from available auth data
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name: supabaseUser.user_metadata?.name || "New User",
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
      bio: userData.bio || undefined,
      // Optionally fetch additional fields based on role
      ...(userData.role === "student" ? { skills: await fetchUserSkills(userData.id_users) } : {})
    };
  } catch (error) {
    console.error('Error transforming user:', error);
    return null;
  }
};

// Helper function to fetch user skills
const fetchUserSkills = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('skills')
      .eq('id_user', userId)
      .single();
    
    if (error || !data) {
      console.error('Error fetching user skills:', error);
      return [];
    }
    
    // Fix the type error - handle case where skills could be null, string, or array
    if (!data.skills) {
      return [];
    } else if (typeof data.skills === 'string') {
      return data.skills.split(',').map((s: string) => s.trim());
    } else if (Array.isArray(data.skills)) {
      return data.skills;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching user skills:', error);
    return [];
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
      (event, currentSession) => {
        console.log("Auth state changed:", event, "Session:", currentSession ? "exists" : "none");
        
        if (currentSession) {
          setSession(currentSession);
          
          // Important: Only synchronous state updates in the callback
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(async () => {
            try {
              const appUser = await transformSupabaseUser(currentSession.user);
              console.log("Setting user from auth change:", appUser);
              setUser(appUser);
            } catch (error) {
              console.error("Error transforming user:", error);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          console.log("Auth change: No user");
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    );
    
    // THEN check for existing session
    const initializeAuth = async () => {
      console.log("Checking for existing session");
      
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log("Initial session:", initialSession ? "Found" : "Not found");
        
        if (initialSession) {
          setSession(initialSession);
          
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
        
        // Only use mock users if they match the exact email
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
    userData: Record<string, any> = {}
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
          },
          emailRedirectTo: window.location.origin + '/login'
        },
      });

      if (error) {
        console.error("Registration error:", error);
        toast.error("Registration failed: " + error.message);
        throw error;
      } 
      
      console.log("Registration successful:", data);
      
      // Note: If email confirmation is required, the session might be null
      if (data.session) {
        toast.success("Account created successfully! You are now logged in.");
        
        // Session and user will be set by the onAuthStateChange handler
        // But we can manually set them for immediate feedback
        setSession(data.session);
        
        setTimeout(async () => {
          try {
            const appUser = await transformSupabaseUser(data.user);
            setUser(appUser);
          } catch (error) {
            console.error("Error setting user after registration:", error);
          }
        }, 0);
      } else {
        // No session means email confirmation is required
        toast.success("Registration successful! Please check your email.");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log("Logging out");
    setLoading(true);
    
    try {
      if (!session) {
        console.error("Cannot logout: No active session");
        toast.error("No active session found");
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        toast.error(error.message);
        return;
      }
      
      console.log("Logout successful");
      setUser(null);
      setSession(null);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    setLoading(true);
    
    try {
      if (!user || !session) {
        console.error("Cannot update profile: no user logged in or session found");
        toast.error("No active session found");
        setLoading(false);
        return;
      }

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
            bio: data.bio,
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
        session,
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
