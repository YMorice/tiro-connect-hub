
import React, { createContext, useContext, useState, useEffect } from "react";
import { Project, Task, Document } from "../types";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "./auth-context";
import { supabase } from "@/integrations/supabase/client";

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  createProject: (data: Partial<Project>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTask: (projectId: string, task: Partial<Task>) => Promise<void>;
  updateTask: (projectId: string, taskId: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  addDocument: (projectId: string, document: Partial<Document>, file?: File) => Promise<void>;
  deleteDocument: (projectId: string, documentId: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch projects when user changes
  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      setProjects([]);
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase.from('projects').select(`
        *,
        tasks(*),
        documents(*)
      `);
      
      // Filter projects based on user role
      if (user.role === 'entrepreneur') {
        query = query.eq('owner_id', user.id);
      } else if (user.role === 'student') {
        query = query.or(`assignee_id.eq.${user.id},status.eq.open`);
      }
      // Admin can see all projects
      
      const { data: projectsData, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (projectsData) {
        const formattedProjects: Project[] = projectsData.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          ownerId: p.owner_id,
          assigneeId: p.assignee_id || undefined,
          status: p.status as "draft" | "open" | "in_progress" | "review" | "completed",
          tasks: (p.tasks || []).map((t: any) => ({
            id: t.id,
            projectId: t.project_id,
            title: t.title,
            description: t.description || "",
            status: t.status as "todo" | "in_progress" | "done",
            assigneeId: t.assignee_id || undefined,
            dueDate: t.due_date ? new Date(t.due_date) : undefined,
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at)
          })),
          documents: (p.documents || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            url: d.url,
            type: d.type,
            projectId: d.project_id,
            uploadedBy: d.uploaded_by,
            createdAt: new Date(d.created_at),
            isDeliverable: d.is_deliverable || false,
            status: d.status,
            reviewComment: d.review_comment
          })),
          packId: p.pack_id || undefined,
          price: p.price || undefined,
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at)
        }));
        
        setProjects(formattedProjects);
      }
    } catch (error: any) {
      toast.error(`Error fetching projects: ${error.message}`);
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (data: Partial<Project>) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: projectData, error } = await supabase
        .from('projects')
        .insert({
          title: data.title || "Untitled Project",
          description: data.description || "",
          owner_id: user.id,
          status: data.status || "draft",
          pack_id: data.packId,
          price: data.price
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      if (projectData && projectData[0]) {
        const newProject: Project = {
          id: projectData[0].id,
          title: projectData[0].title,
          description: projectData[0].description,
          ownerId: projectData[0].owner_id,
          status: projectData[0].status,
          tasks: [],
          documents: [],
          packId: projectData[0].pack_id,
          price: projectData[0].price,
          createdAt: new Date(projectData[0].created_at),
          updatedAt: new Date(projectData[0].updated_at)
        };
        
        setProjects([...projects, newProject]);
        toast.success("Project created successfully");
      }
    } catch (error: any) {
      toast.error(`Error creating project: ${error.message}`);
      console.error("Error creating project:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: data.title,
          description: data.description,
          status: data.status,
          assignee_id: data.assigneeId,
          pack_id: data.packId,
          price: data.price,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setProjects(
        projects.map((project) => {
          if (project.id === id) {
            return { ...project, ...data, updatedAt: new Date() };
          }
          return project;
        })
      );
      
      toast.success("Project updated");
    } catch (error: any) {
      toast.error(`Error updating project: ${error.message}`);
      console.error("Error updating project:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setProjects(projects.filter((project) => project.id !== id));
      toast.success("Project deleted");
    } catch (error: any) {
      toast.error(`Error deleting project: ${error.message}`);
      console.error("Error deleting project:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (projectId: string, taskData: Partial<Task>) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: taskData.title || "New Task",
          description: taskData.description || "",
          status: taskData.status || "todo",
          assignee_id: taskData.assigneeId,
          due_date: taskData.dueDate?.toISOString()
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      if (data && data[0]) {
        const newTask: Task = {
          id: data[0].id,
          projectId: data[0].project_id,
          title: data[0].title,
          description: data[0].description || "",
          status: data[0].status,
          assigneeId: data[0].assignee_id,
          dueDate: data[0].due_date ? new Date(data[0].due_date) : undefined,
          createdAt: new Date(data[0].created_at),
          updatedAt: new Date(data[0].updated_at)
        };
        
        setProjects(
          projects.map((project) => {
            if (project.id === projectId) {
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
      }
    } catch (error: any) {
      toast.error(`Error adding task: ${error.message}`);
      console.error("Error adding task:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (projectId: string, taskId: string, data: Partial<Task>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: data.title,
          description: data.description,
          status: data.status,
          assignee_id: data.assigneeId,
          due_date: data.dueDate?.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) {
        throw error;
      }
      
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
    } catch (error: any) {
      toast.error(`Error updating task: ${error.message}`);
      console.error("Error updating task:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) {
        throw error;
      }
      
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
    } catch (error: any) {
      toast.error(`Error deleting task: ${error.message}`);
      console.error("Error deleting task:", error);
    } finally {
      setLoading(false);
    }
  };

  const addDocument = async (projectId: string, documentData: Partial<Document>, file?: File) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let fileUrl = documentData.url || "#";
      
      // If a file is provided, upload it to Supabase storage
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${projectId}/${fileName}`;
        
        // Create bucket if it doesn't exist
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('documents');
        if (bucketError && bucketError.message.includes('not found')) {
          await supabase.storage.createBucket('documents', {
            public: true,
            fileSizeLimit: 10485760 // 10MB
          });
        }
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) {
          throw uploadError;
        }
        
        if (uploadData) {
          const { data: urlData } = await supabase.storage
            .from('documents')
            .getPublicUrl(uploadData.path);
            
          fileUrl = urlData.publicUrl;
        }
      }
      
      // Determine document type from file if available
      const getDocumentType = (file?: File) => {
        if (!file) return documentData.type || "unknown";
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension) return "unknown";
        
        if (["pdf"].includes(extension)) return "pdf";
        if (["doc", "docx"].includes(extension)) return "doc";
        if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image";
        if (["zip", "rar"].includes(extension)) return "zip";
        
        return "unknown";
      };
      
      // Insert document record in the database
      const { data, error } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          name: file ? file.name : (documentData.name || "Untitled Document"),
          url: fileUrl,
          type: getDocumentType(file),
          uploaded_by: user.id,
          is_deliverable: documentData.isDeliverable || false,
          status: documentData.status,
          review_comment: documentData.reviewComment
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      if (data && data[0]) {
        const newDocument: Document = {
          id: data[0].id,
          name: data[0].name,
          url: data[0].url,
          type: data[0].type,
          projectId: data[0].project_id,
          uploadedBy: data[0].uploaded_by,
          createdAt: new Date(data[0].created_at),
          isDeliverable: data[0].is_deliverable || false,
          status: data[0].status,
          reviewComment: data[0].review_comment
        };
        
        setProjects(
          projects.map((project) => {
            if (project.id === projectId) {
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
      }
    } catch (error: any) {
      toast.error(`Error adding document: ${error.message}`);
      console.error("Error adding document:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (projectId: string, documentId: string) => {
    setLoading(true);
    try {
      // First get the document to get the file path
      const { data: documentData, error: fetchError } = await supabase
        .from('documents')
        .select('url')
        .eq('id', documentId)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Try to delete the file from storage if it's a Supabase URL
      if (documentData && documentData.url && documentData.url.includes('storage.supabase.co')) {
        const path = new URL(documentData.url).pathname.split('/').slice(2).join('/');
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([path]);
          
        if (storageError) {
          console.warn("Could not delete file from storage:", storageError);
          // Continue with deleting the database record even if storage delete fails
        }
      }
      
      // Delete the document record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
      
      if (error) {
        throw error;
      }
      
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
    } catch (error: any) {
      toast.error(`Error deleting document: ${error.message}`);
      console.error("Error deleting document:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        createProject,
        updateProject,
        deleteProject,
        addTask,
        updateTask,
        deleteTask,
        addDocument,
        deleteDocument,
        fetchProjects
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
