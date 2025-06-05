import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Project, Task, Document } from "../types";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "./auth-context";
import { supabase } from "@/integrations/supabase/client";

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  setProjects: (projects: Project[]) => void;
  createProject: (data: Partial<Project>) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addTask: (projectId: string, task: Partial<Task>) => void;
  updateTask: (projectId: string, taskId: string, data: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  addDocument: (projectId: string, document: Partial<Document>, file?: File) => void;
  deleteDocument: (projectId: string, documentId: string) => void;
  loadProjects: () => Promise<void>;
}

// Helper function to convert database status to display status
const convertDbStatusToDisplay = (dbStatus: string): Project['status'] => {
  const statusMap: { [key: string]: Project['status'] } = {
    'STEP1': 'New',
    'STEP2': 'Proposals', 
    'STEP3': 'Selection',
    'STEP4': 'Payment',
    'STEP5': 'Active',
    'STEP6': 'In progress'
  };
  return statusMap[dbStatus] || 'New';
};

// Helper function to convert display status to database status
const convertDisplayStatusToDb = (displayStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    'New': 'STEP1',
    'Proposals': 'STEP2',
    'Selection': 'STEP3', 
    'Payment': 'STEP4',
    'Active': 'STEP5',
    'In progress': 'STEP6'
  };
  return statusMap[displayStatus] || displayStatus;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Memoize user role to prevent unnecessary re-renders
  const userRole = useMemo(() => (user as any)?.role, [user]);
  const userId = useMemo(() => user?.id, [user]);

  const loadProjects = useCallback(async () => {
    if (!userId || !userRole) {
      console.log('No user or role found');
      setProjects([]);
      return;
    }
    
    // Prevent multiple simultaneous requests
    if (loading) {
      console.log('Already loading projects, skipping...');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading projects for user:', userId, 'role:', userRole);
      
      let projectsData: any[] = [];

      if (userRole === 'entrepreneur') {
        // Get entrepreneur ID first
        const { data: entrepreneurData, error: entrepreneurError } = await supabase
          .from('entrepreneurs')
          .select('id_entrepreneur')
          .eq('id_user', userId)
          .single();

        if (entrepreneurError) {
          console.error('Error fetching entrepreneur:', entrepreneurError);
          throw entrepreneurError;
        }

        if (entrepreneurData) {
          // Fetch projects for entrepreneur
          const { data, error } = await supabase
            .from('projects')
            .select(`
              id_project,
              title,
              description,
              status,
              created_at,
              updated_at,
              price,
              id_entrepreneur,
              selected_student
            `)
            .eq('id_entrepreneur', entrepreneurData.id_entrepreneur)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching projects:', error);
            throw error;
          }
          projectsData = data || [];
        }
      } else if (userRole === 'student') {
        // Get student ID first
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id_student')
          .eq('id_user', userId)
          .single();

        if (studentError) {
          console.error('Error fetching student:', studentError);
          throw studentError;
        }

        if (studentData) {
          // Fetch projects where student is selected
          const { data, error } = await supabase
            .from('projects')
            .select(`
              id_project,
              title,
              description,
              status,
              created_at,
              updated_at,
              price,
              id_entrepreneur,
              selected_student
            `)
            .eq('selected_student', studentData.id_student)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching projects:', error);
            throw error;
          }
          projectsData = data || [];
        }
      }

      // Convert to the format expected by the UI
      const formattedProjects: Project[] = projectsData.map(project => ({
        id: project.id_project,
        title: project.title,
        description: project.description || '',
        ownerId: project.id_entrepreneur,
        assigneeId: project.selected_student,
        status: convertDbStatusToDisplay(project.status),
        tasks: [], // Tasks would need separate fetch if needed
        documents: [], // Documents would need separate fetch if needed
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at || project.created_at),
      }));

      console.log('Projects loaded:', formattedProjects.length);
      setProjects(formattedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, loading]);

  // Load projects only when user changes and prevent multiple calls
  useEffect(() => {
    let isMounted = true;
    
    if (userId && userRole) {
      loadProjects().then(() => {
        if (!isMounted) {
          console.log('Component unmounted, ignoring result');
        }
      });
    } else {
      setProjects([]);
    }

    return () => {
      isMounted = false;
    };
  }, [userId, userRole]); // Remove loadProjects from dependencies to prevent infinite loops

  const createProject = (data: Partial<Project>) => {
    if (!user) return;

    const newProject: Project = {
      id: String(projects.length + 1),
      title: data.title || "Untitled Project",
      description: data.description || "",
      ownerId: data.ownerId || user.id,
      status: "New",
      tasks: [],
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };

    setProjects([...projects, newProject]);
    toast.success("Project created successfully");
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    // Update the local state
    setProjects(
      projects.map((project) => {
        if (project.id === id) {
          return { ...project, ...data, updatedAt: new Date() };
        }
        return project;
      })
    );
    
    toast.success("Project updated");
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter((project) => project.id !== id));
    toast.success("Project deleted");
  };

  const addTask = async (projectId: string, taskData: Partial<Task>) => {
    try {
      // Local project handling
      setProjects(
        projects.map((project) => {
          if (project.id === projectId) {
            const newTask: Task = {
              id: String(Math.random()).substring(2, 8),
              projectId,
              title: taskData.title || "New Task",
              description: taskData.description || "",
              status: "todo",
              createdAt: new Date(),
              updatedAt: new Date(),
              ...taskData,
            };
            return {
              ...project,
              tasks: [...project.tasks, newTask],
              updatedAt: new Date(),
            };
          }
          return project;
        })
      );
      
      toast.success("Task added");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    }
  };

  const updateTask = async (projectId: string, taskId: string, data: Partial<Task>) => {
    try {
      // Update local state
      setProjects(
        projects.map((project) => {
          if (project.id === projectId) {
            const updatedTasks = project.tasks.map((task) => {
              if (task.id === taskId) {
                return { ...task, ...data, updatedAt: new Date() };
              }
              return task;
            });
            return { ...project, tasks: updatedTasks, updatedAt: new Date() };
          }
          return project;
        })
      );
      
      toast.success("Task updated");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    try {
      // Update local state
      setProjects(
        projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.filter((task) => task.id !== taskId),
              updatedAt: new Date(),
            };
          }
          return project;
        })
      );
      
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const addDocument = (projectId: string, documentData: Partial<Document>, file?: File) => {
    if (!user) return;
    
    // Create an object URL if a file is provided
    const documentUrl = file ? URL.createObjectURL(file) : "#";
    
    // Determine document type from file if available
    const getDocumentType = (file?: File) => {
      if (!file) return "unknown";
      
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension) return "unknown";
      
      if (["pdf"].includes(extension)) return "pdf";
      if (["doc", "docx"].includes(extension)) return "doc";
      if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image";
      if (["zip", "rar"].includes(extension)) return "zip";
      
      return "unknown";
    };
    
    setProjects(
      projects.map((project) => {
        if (project.id === projectId) {
          const newDocument: Document = {
            id: String(Math.random()).substring(2, 8),
            name: documentData.name || (file ? file.name : "Untitled Document"),
            url: documentUrl,
            type: getDocumentType(file),
            projectId,
            uploadedBy: user.id,
            createdAt: new Date(),
          };
          return {
            ...project,
            documents: [...project.documents, newDocument],
            updatedAt: new Date(),
          };
        }
        return project;
      })
    );
    toast.success("Document added");
  };

  const deleteDocument = (projectId: string, documentId: string) => {
    setProjects(
      projects.map((project) => {
        if (project.id === projectId) {
          return {
            ...project,
            documents: project.documents.filter((doc) => doc.id !== documentId),
            updatedAt: new Date(),
          };
        }
        return project;
      })
    );
    toast.success("Document deleted");
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    projects,
    loading,
    setProjects,
    createProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addDocument,
    deleteDocument,
    loadProjects,
  }), [projects, loading, loadProjects]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
};
