
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
        console.log('Loading initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        console.log('Initial session loaded:', session?.user?.id || 'no session');
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id || 'no session');
        
        setSession(session);

        if (session?.user && event === 'SIGNED_IN') {
          console.log('User signed in, fetching profile...');
          try {
            await fetchUser(session);
          } catch (error) {
            console.error('Error fetching user on auth change:', error);
            setUser(null);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
        }
        
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
        if (error.code === 'PGRST116') {
          console.log('User profile not found, creating minimal profile...');
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id_users: session.user.id,
              email: session.user.email || '',
              name: (session.user.user_metadata as any)?.name || 'User',
              surname: (session.user.user_metadata as any)?.surname || 'User',
              role: (session.user.user_metadata as any)?.role || 'student',
            });
          if (insertError) {
            console.error('Error creating user profile:', insertError);
            throw insertError;
          }
          return await fetchUser(session);
        }
        throw error;
      }

      if (userProfile) {
        let bio: string = '';
        let skills: string[] = [];
        let specialty: string = '';
        
        if (userProfile.role === 'student') {
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('biography, skills, specialty')
            .eq('id_user', session.user.id)
            .single();
            
          if (!studentError && studentData) {
            bio = studentData.biography || '';
            skills = Array.isArray(studentData.skills) ? studentData.skills : [];
            specialty = studentData.specialty || '';
          }
        }

        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: userProfile.name || '',
          role: userProfile.role || 'student',
          avatar: userProfile.pp_link || '',
          bio: bio,
          skills: skills,
          specialty: specialty,
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
      console.log('Starting registration for:', email);
      
      const cleanUserData = {
        name,
        surname,
        role,
        about: userData.about || null,
        specialty: userData.specialty || null,
        portfolioLink: userData.portfolioUrl || null,
        formation: userData.formation || null,
        phone: userData.phoneNumber || null,
        address: userData.address || userData.companyAddress || null,
        iban: userData.iban || null,
        companyName: userData.companyName || null,
        companyRole: userData.companyRole || null,
        siret: userData.siret || null,
        skills: (userData.skills && userData.skills.length > 0) ? userData.skills.join(',') : null,
        pp_link: userData.avatar || null,
      };

      console.log('Cleaned user metadata for registration:', cleanUserData);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: cleanUserData,
        },
      });

      if (error) {
        console.error('Registration error:', error);
        toast.error(error.message || 'Registration failed');
        return { user: null, error: error.message };
      }

      if (data.user) {
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
    }
  };

  const login = async (email: string, password: string) => {
    try {
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
        setSession(data.session);
        
        // Set a simple user object immediately to prevent undefined errors
        const simpleUser: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: 'Loading...',
          role: 'student',
          avatar: '',
          bio: '',
          skills: [],
          specialty: '',
          createdAt: new Date(data.user.created_at),
          isOnline: true,
        };
        setUser(simpleUser);
        
        // Then fetch the full profile in the background
        setTimeout(() => {
          fetchUser(data.session);
        }, 0);
  
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
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      navigate('/');
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
        },
      });

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

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
