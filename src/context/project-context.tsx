
import React, { createContext, useContext, useState, useEffect } from "react";
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
const convertDbStatusToDisplay = (dbStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    'STEP1': 'New',
    'STEP2': 'Proposals', 
    'STEP3': 'Selection',
    'STEP4': 'Payment',
    'STEP5': 'Active',
    'STEP6': 'In progress'
  };
  return statusMap[dbStatus] || dbStatus;
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

// Mock projects for demonstration with updated status values
const mockProjects: Project[] = [
  {
    id: "1",
    title: "E-commerce Website Redesign",
    description: "Complete overhaul of our online store with improved UX and mobile responsiveness.",
    ownerId: "1", // entrepreneur
    assigneeId: "2", // student
    status: "Active",
    tasks: [
      {
        id: "101",
        projectId: "1",
        title: "Create wireframes",
        description: "Design initial wireframes for all key pages",
        status: "done",
        assigneeId: "2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "102",
        projectId: "1",
        title: "Implement landing page",
        description: "Code the new landing page based on approved design",
        status: "in_progress",
        assigneeId: "2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        id: "201",
        name: "Project Brief.pdf",
        url: "#",
        type: "pdf",
        projectId: "1",
        uploadedBy: "1",
        createdAt: new Date(),
      },
      {
        id: "202",
        name: "Design Assets.zip",
        url: "#",
        type: "zip",
        projectId: "1",
        uploadedBy: "2",
        createdAt: new Date(),
      },
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "Mobile App UI Design",
    description: "Design the user interface for a new fitness tracking app.",
    ownerId: "1", // entrepreneur
    status: "New",
    tasks: [],
    documents: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProjects = async () => {
    if (!user) {
      console.log('No user found, using mock projects');
      setProjects(mockProjects);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading projects for user:', user.id, 'role:', (user as any)?.role);
      
      // For now, just use mock projects to avoid database connection issues
      // In production, you would fetch from the database here
      if ((user as any)?.role === 'entrepreneur') {
        console.log('Loading projects for entrepreneur');
        setProjects(mockProjects);
      } else {
        console.log('Loading projects for other user type');
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      // Fallback to mock projects if database fails
      setProjects(mockProjects);
    } finally {
      setLoading(false);
    }
  };

  // Load projects when user changes
  useEffect(() => {
    if (user) {
      loadProjects();
    } else {
      setProjects([]);
    }
  }, [user]);

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

  return (
    <ProjectContext.Provider
      value={{
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
      }}
    >
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
