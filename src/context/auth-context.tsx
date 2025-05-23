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
  ) => Promise<{ success: boolean, error?: string }>;
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
    console.log("User metadata:", supabaseUser.user_metadata);
    
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
    
    // Since role is no longer in the users table, we need to get it from user_metadata
    // or try to determine it by checking related tables
    let userRole: "student" | "entrepreneur" | "admin" = "entrepreneur"; // Default role
    
    // First try to get role from metadata
    if (supabaseUser.user_metadata?.role) {
      userRole = supabaseUser.user_metadata.role as "student" | "entrepreneur" | "admin";
    } else {
      // Try to determine role by checking if user exists in students or entrepreneurs table
      const { data: studentData } = await supabase
        .from('students')
        .select('id_student')
        .eq('id_user', userData.id_users)
        .maybeSingle();
        
      if (studentData) {
        userRole = "student";
      } else {
        const { data: entrepreneurData } = await supabase
          .from('entrepreneurs')
          .select('id_entrepreneur')
          .eq('id_user', userData.id_users)
          .maybeSingle();
          
        if (entrepreneurData) {
          userRole = "entrepreneur";
        }
      }
    }
    
    console.log("Determined user role:", userRole);
    
    // Get bio from appropriate table based on role
    let userBio: string | undefined;
    
    if (userRole === "student") {
      const { data: studentData } = await supabase
        .from('students')
        .select('biography')
        .eq('id_user', userData.id_users)
        .maybeSingle();
      
      userBio = studentData?.biography;
    } else if (userRole === "entrepreneur") {
      // If entrepreneurs have a bio field in their table, you'd fetch it similarly
      // For now, we'll use the user metadata if available
      userBio = supabaseUser.user_metadata?.bio;
    }
    
    // Map Supabase user data to our app's User type
    return {
      id: userData.id_users,
      email: userData.email,
      name: userData.name || "New User",
      role: userRole,
      createdAt: new Date(userData.created_at || Date.now()),
      bio: userBio,
      // Optionally fetch additional fields based on role
      ...(userRole === "student" ? { skills: await fetchUserSkills(userData.id_users) } : {})
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
      // Cast to string explicitly to satisfy TypeScript
      return (data.skills as string).split(',').map(s => s.trim());
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
    console.log("=== REGISTRATION STARTED ===");
    console.log("Email:", email);
    console.log("Name:", name);
    console.log("Surname:", surname);
    console.log("Role:", role);
    console.log("User data:", userData);

    try {
      // Create a clean metadata object with all user data
      const metadata: Record<string, any> = {
        name,
        surname,
        role,
      };
      
      // Add all userData properties to metadata
      Object.keys(userData).forEach(key => {
        // Handle skills specially to ensure they're properly formatted
        if (key === 'skills') {
          if (Array.isArray(userData.skills)) {
            metadata.skills = userData.skills.join(',');
          } else if (typeof userData.skills === 'string') {
            metadata.skills = userData.skills;
          }
        } else {
          metadata[key] = userData[key];
        }
      });
      
      // Remove any undefined or null values from metadata
      Object.keys(metadata).forEach(key => {
        if (metadata[key] === undefined || metadata[key] === null) {
          delete metadata[key];
        }
      });
      
      console.log("Final metadata for registration:", metadata);
      
      // Call Supabase Auth signUp directly
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) {
        console.error("Registration error:", error);
        toast.error("Registration failed: " + error.message);
        setLoading(false);
        return { success: false, error: error.message };
      }
      
      console.log("Registration successful:", data);
      console.log("User data:", data.user);
      console.log("User metadata:", data.user?.user_metadata);
      
      // Check if email confirmation is required
      if (!data.session) {
        toast.success("Registration successful! Please check your email to confirm your account.");
        setLoading(false);
        return { success: true };
      }
      
      // If session exists, user is logged in immediately
      console.log("Setting session after registration:", data.session);
      setSession(data.session);
      
      // Transform the user data
      setTimeout(async () => {
        try {
          if (data.user) {
            const appUser = await transformSupabaseUser(data.user);
            console.log("Setting user after registration:", appUser);
            setUser(appUser);
          }
        } catch (error) {
          console.error("Error setting user after registration:", error);
        } finally {
          setLoading(false);
        }
      }, 0);
      
      toast.success("Account created successfully! You are now logged in.");
      return { success: true };
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error("Failed to create account: " + (error?.message || "Unknown error"));
      setLoading(false);
      return { success: false, error: error?.message || "Unknown error" };
    }
  };

  const logout = async () => {
    console.log("Logging out");
    setLoading(true);
    
    try {
      // Check if we have a mock session (for mock users)
      const isMockUser = user && (!session || Object.keys(session).length === 0);
      
      if (isMockUser) {
        console.log("Logging out mock user");
        setUser(null);
        setSession(null);
        toast.success("Logged out successfully");
        setLoading(false);
        return;
      }
      
      // For real Supabase users, attempt to sign out
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
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
      
      // Force logout in case of errors
      setUser(null);
      setSession(null);
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
        setLoading(false);
        return;
      }

      // Update our public.users table
      if (user.id) {
        console.log("Updating user in database:", user.id);
        
        const updateData: Record<string, any> = {};
        
        // Only add fields that are actually provided
        if (data.name !== undefined) updateData.name = data.name;
        if (data.bio !== undefined) updateData.bio = data.bio;
        
        console.log("Update data for database:", updateData);
        
        const { error: dbError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id_users', user.id);

        if (dbError) {
          console.error("Profile update error (db):", dbError);
          toast.error(dbError.message);
          setLoading(false);
          return;
        }
        
        // If user is a student, update skills in the students table
        if (user.role === 'student' && data.skills) {
          console.log("Updating student skills:", data.skills);
          
          const { error: studentError } = await supabase
            .from('students')
            .update({
              skills: data.skills
            })
            .eq('id_user', user.id);
            
          if (studentError) {
            console.error("Student skills update error:", studentError);
            toast.error(studentError.message);
            setLoading(false);
            return;
          }
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
