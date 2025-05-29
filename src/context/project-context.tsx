
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
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [loading, setLoading] = useState(false);

  const loadProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get entrepreneur ID first
      const { data: entrepreneurData } = await supabase
        .from('entrepreneurs')
        .select('id_entrepreneur')
        .eq('id_user', user.id)
        .single();

      if (!entrepreneurData) {
        setLoading(false);
        return;
      }

      // Fetch projects for this entrepreneur
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('id_entrepreneur', entrepreneurData.id_entrepreneur);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        setLoading(false);
        return;
      }

      // Convert database projects to our Project type and fetch related data for each
      const convertedProjects: Project[] = await Promise.all(
        (projectsData || []).map(async (dbProject) => {
          // Fetch documents for this project
          const { data: documentsData } = await supabase
            .from('documents')
            .select('*')
            .eq('id_project', dbProject.id_project);

          // Fetch tasks for this project
          const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('id_project', dbProject.id_project);

          const documents: Document[] = (documentsData || []).map(doc => ({
            id: doc.id_document,
            name: doc.name,
            url: doc.link,
            type: doc.type,
            projectId: doc.id_project,
            uploadedBy: entrepreneurData.id_entrepreneur,
            createdAt: new Date(doc.created_at),
          }));

          // Convert task status to proper type
          const tasks: Task[] = (tasksData || []).map(task => {
            let taskStatus: "todo" | "in_progress" | "done" = "todo";
            if (task.status === "in_progress" || task.status === "done") {
              taskStatus = task.status as "todo" | "in_progress" | "done";
            }

            return {
              id: task.id_task,
              projectId: task.id_project || "",
              title: task.title || "Untitled Task",
              description: task.description || "",
              status: taskStatus,
              createdAt: new Date(task.created_at),
              updatedAt: new Date(task.created_at),
            };
          });

          return {
            id: dbProject.id_project,
            title: dbProject.title,
            description: dbProject.description || "",
            ownerId: dbProject.id_entrepreneur,
            assigneeId: dbProject.selected_student,
            status: convertDbStatusToDisplay(dbProject.status || "STEP1") as any,
            tasks,
            documents,
            packId: dbProject.id_pack || undefined,
            createdAt: new Date(dbProject.created_at),
            updatedAt: new Date(dbProject.updated_at),
          };
        })
      );

      // Combine with mock projects
      setProjects([...mockProjects, ...convertedProjects]);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Load projects when user changes
  useEffect(() => {
    if (user) {
      loadProjects();
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
        const { error } = await supabase
          .from('projects')
          .update({
            title: data.title,
            description: data.description,
            status: data.status ? convertDisplayStatusToDb(data.status) : undefined,
            selected_student: data.assigneeId,
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

  const addTask = async (projectId: string, taskData: Partial<Task>) => {
    try {
      // If it's a database project, add to database
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            id_project: projectId,
            title: taskData.title || "New Task",
            description: taskData.description || "",
            status: taskData.status || "todo"
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state with the new task
        setProjects(
          projects.map((project) => {
            if (project.id === projectId) {
              const newTask: Task = {
                id: data.id_task,
                projectId,
                title: data.title || "New Task",
                description: data.description || "",
                status: (data.status as "todo" | "in_progress" | "done") || "todo",
                createdAt: new Date(data.created_at),
                updatedAt: new Date(data.created_at),
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
      } else {
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
      }
      
      toast.success("Task added");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    }
  };

  const updateTask = async (projectId: string, taskId: string, data: Partial<Task>) => {
    try {
      // If it's a database task, update in database
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
        const { error } = await supabase
          .from('tasks')
          .update({
            title: data.title,
            description: data.description,
            status: data.status
          })
          .eq('id_task', taskId);

        if (error) throw error;
      }

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
      // If it's a database task, delete from database
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id_task', taskId);

        if (error) throw error;
      }

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
