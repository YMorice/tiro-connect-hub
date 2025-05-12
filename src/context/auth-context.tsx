
import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "../types";
import { toast } from "@/components/ui/sonner";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => void;
}

// Mock users for demonstration
const mockUsers: User[] = [
  {
    id: "1",
    email: "entrepreneur@example.com",
    name: "Jean Martin",
    role: "entrepreneur",
    avatar: "",
    bio: "Founder of a tech startup focused on AI solutions",
    createdAt: new Date(),
  },
  {
    id: "2",
    email: "student@example.com",
    name: "Marie Dubois",
    role: "student",
    avatar: "",
    bio: "Web design student specializing in UI/UX",
    skills: ["UI Design", "HTML/CSS", "JavaScript"],
    createdAt: new Date(),
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in via localStorage
    const storedUser = localStorage.getItem("tiro-user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const foundUser = mockUsers.find(u => u.email === email);
      if (!foundUser) {
        throw new Error("Invalid credentials");
      }
      
      // In a real app, you would validate the password here
      setUser(foundUser);
      localStorage.setItem("tiro-user", JSON.stringify(foundUser));
      toast.success("Successfully logged in");
    } catch (error) {
      toast.error("Login failed: " + (error instanceof Error ? error.message : "Unknown error"));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Check if user already exists
      if (mockUsers.some(u => u.email === email)) {
        throw new Error("User already exists");
      }
      
      // Create new user
      const newUser: User = {
        id: String(mockUsers.length + 1),
        email,
        name,
        role,
        createdAt: new Date(),
      };
      
      mockUsers.push(newUser);
      setUser(newUser);
      localStorage.setItem("tiro-user", JSON.stringify(newUser));
      toast.success("Registration successful");
    } catch (error) {
      toast.error("Registration failed: " + (error instanceof Error ? error.message : "Unknown error"));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("tiro-user");
    toast.info("You have been logged out");
  };

  const updateProfile = (userData: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem("tiro-user", JSON.stringify(updatedUser));
    toast.success("Profile updated successfully");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
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
