
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Session,
  User as SupabaseUser,
} from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  register: (email: string, password: string, name: string, surname: string, role: UserRole, userData?: any) => Promise<{ user: SupabaseUser | null; error: any }>;
  login: (email: string, password: string) => Promise<{ user: SupabaseUser | null; error: any }>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(session);

        if (session?.user) {
          await fetchUser(session);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in loadSession:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    // Listen for changes on auth state (login, signout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id);
        
        setSession(session);

        if (session?.user) {
          // Don't set loading here to avoid blocking buttons
          try {
            await fetchUser(session);
          } catch (error) {
            console.error('Error fetching user on auth change:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        
        // Always ensure loading is false after auth state change
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUser = async (session: Session) => {
    try {
      console.log('Fetching user profile for:', session.user.id);
      
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id_users', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // If user profile doesn't exist, clear the session
        if (error.code === 'PGRST116') {
          console.log('User profile not found, signing out...');
          await supabase.auth.signOut();
          return;
        }
        throw error;
      }

      if (userProfile) {
        // We need to fetch additional data based on the user role
        let bio: string | undefined = undefined;
        let skills: string[] | undefined = undefined;
        let specialty: string | undefined = undefined;
        
        if (userProfile.role === 'student') {
          // Fetch student-specific data
          const { data: studentData } = await supabase
            .from('students')
            .select('biography, skills, specialty')
            .eq('id_user', session.user.id)
            .single();
            
          if (studentData) {
            bio = studentData.biography;
            skills = studentData.skills;
            specialty = studentData.specialty;
          }
        }

        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: userProfile.name || '',
          role: userProfile.role || 'student',
          avatar: userProfile.pp_link || '',
          bio: bio || '',
          skills: skills || [],
          specialty: specialty || '',
          createdAt: new Date(session.user.created_at),
          isOnline: true,
        };
        
        console.log('User profile loaded successfully:', user.email);
        setUser(user);
      }
    } catch (error) {
      console.error('Error fetching or setting user data:', error);
      setUser(null);
    }
  };

  const register = async (email: string, password: string, name: string, surname: string, role: UserRole, userData: any = {}) => {
    try {
      setLoading(true);
      console.log('Starting registration for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            surname,
            role,
            about: userData.about,
            specialty: userData.specialty,
            portfolioLink: userData.portfolioLink,
            formation: userData.formation,
            phone: userData.phone,
            address: userData.address,
            iban: userData.iban,
            companyName: userData.companyName,
            companyRole: userData.companyRole,
            siret: userData.siret,
            skills: userData.skills,
            pp_link: userData.pp_link,
          },
        },
      });

      if (error) {
        console.error('Registration error:', error);
        toast.error(error.message || 'Registration failed');
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Insert user details into the 'users' table
        const { error: userTableError } = await supabase
          .from('users')
          .insert([
            {
              id_users: data.user.id,
              name,
              surname,
              email,
              role,
              about: userData.about,
              specialty: userData.specialty,
              portfolioLink: userData.portfolioLink,
              formation: userData.formation,
              phone: userData.phone,
              address: userData.address,
              iban: userData.iban,
              companyName: userData.companyName,
              companyRole: userData.companyRole,
              siret: userData.siret,
              skills: userData.skills,
              pp_link: userData.pp_link,
            },
          ]);

        if (userTableError) {
          console.error('Error inserting user data:', userTableError);
          toast.error('Failed to create user profile');
          return { user: null, error: userTableError.message };
        }

        // Insert role-specific details
        if (role === 'student') {
          const { error: studentError } = await supabase
            .from('students')
            .insert([
              {
                id_user: data.user.id,
                biography: userData.about,
                specialty: userData.specialty,
                portfolio_link: userData.portfolioLink,
                formation: userData.formation,
              },
            ]);

          if (studentError) {
            console.error('Error inserting student data:', studentError);
            toast.error('Failed to create student profile');
            return { user: null, error: studentError.message };
          }
        } else if (role === 'entrepreneur') {
          const { error: entrepreneurError } = await supabase
            .from('entrepreneurs')
            .insert([
              {
                id_user: data.user.id,
                company_name: userData.companyName,
                company_role: userData.companyRole,
              },
            ]);

          if (entrepreneurError) {
            console.error('Error inserting entrepreneur data:', entrepreneurError);
            toast.error('Failed to create entrepreneur profile');
            return { user: null, error: entrepreneurError.message };
          }
        }

        // If there's project info, create the project
        if (userData.projectName && userData.projectDescription && userData.projectDeadline) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .insert({
              title: userData.projectName,
              description: userData.projectDescription,
              id_entrepreneur: data.user.id,
              status: 'open',
            })
            .select();

          if (projectError) {
            console.error('Error creating project:', projectError);
            toast.error('Failed to create project');
            return { user: null, error: projectError.message };
          }

          console.log("Project created successfully:", projectData);
        }

        console.log('Registration successful for:', email);
        toast.success('Registration successful!');
        return { user: data.user, error: null };
      } else {
        toast.error('Failed to create user');
        return { user: null, error: 'Failed to create user.' };
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      toast.error(err.message || 'Registration failed');
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Starting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        toast.error(error.message || 'Login failed');
        return { user: null, error: error.message };
      }

      if (data.user && data.session) {
        console.log('Login successful for:', email);
        toast.success('Login successful!');
        return { user: data.user, error: null };
      } else {
        toast.error('Login failed');
        return { user: null, error: 'Login failed.' };
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      toast.error(err.message || 'Login failed');
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      navigate('/'); // Redirect to login page after logout
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    if (!session?.user) {
      console.error('No active session found.');
      throw new Error('No active session found');
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        data: {
          name: userData.name,
          avatar: userData.avatar,
          // Add other fields you want to update in auth.user
        },
      });

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      // Make sure the pp_link gets updated in the users table
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ 
          name: userData.name,
          pp_link: userData.avatar
        })
        .eq('id_users', session.user.id);

      if (userUpdateError) {
        console.error('Error updating user profile:', userUpdateError);
        throw userUpdateError;
      }

      // Update the user object in the local state
      setUser((prevUser) => {
        if (prevUser) {
          return { ...prevUser, ...userData };
        }
        return prevUser;
      });
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      throw new Error(error.message || 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    register,
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
