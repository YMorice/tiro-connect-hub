
import React, { createContext, useContext, useState } from "react";
import { Project, Task, Document, statusMapping } from "../types";
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
}

// Mock projects for demonstration with updated status values
const mockProjects: Project[] = [
  {
    id: "1",
    title: "E-commerce Website Redesign",
    description: "Complete overhaul of our online store with improved UX and mobile responsiveness.",
    ownerId: "1", // entrepreneur
    assigneeId: "2", // student
    status: "STEP5", // Updated from "in_progress"
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
    status: "STEP1", // Updated from "open"
    tasks: [],
    documents: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [loading, setLoading] = useState(false);

  const createProject = (data: Partial<Project>) => {
    if (!user) return;

    const newProject: Project = {
      id: String(projects.length + 1),
      title: data.title || "Untitled Project",
      description: data.description || "",
      ownerId: data.ownerId || user.id,
      status: "STEP1", // Updated from "draft"
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
    // First update the local state
    setProjects(
      projects.map((project) => {
        if (project.id === id) {
          return { ...project, ...data, updatedAt: new Date() };
        }
        return project;
      })
    );
    
    // Then attempt to update the database if it's a database-stored project
    try {
      // Check if this is a UUID (database) project
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        // Convert status to database format if needed
        const dbStatus = data.status;
        
        const { error } = await supabase
          .from('projects')
          .update({
            title: data.title,
            description: data.description,
            status: dbStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id_project', id);
          
        if (error) {
          throw error;
        }
      }
      
      toast.success("Project updated");
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project in database");
    }
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter((project) => project.id !== id));
    toast.success("Project deleted");
  };

  const addTask = (projectId: string, taskData: Partial<Task>) => {
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
  };

  const updateTask = (projectId: string, taskId: string, data: Partial<Task>) => {
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
  };

  const deleteTask = (projectId: string, taskId: string) => {
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
