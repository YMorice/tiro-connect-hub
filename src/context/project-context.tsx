
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "./auth-context";
import { Project, Task, Document, Message } from "@/types";
import { PostgrestError } from "@supabase/supabase-js";

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: PostgrestError | null;
  createProject: (project: Partial<Project>) => Promise<Project | null>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  getProjectById: (id: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<void>;
  addTask: (projectId: string, task: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  uploadDocument: (projectId: string, file: File, type: string, isDeliverable?: boolean) => Promise<void>;
  getDocuments: (projectId: string) => Promise<Document[]>;
  updateDocumentStatus: (documentId: string, status: "pending" | "approved" | "rejected", comment?: string) => Promise<void>;
  sendMessage: (message: Partial<Message>) => Promise<void>;
  getMessages: (recipientId: string, projectId?: string) => Promise<Message[]>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  filterProjectsByStatus: (status: string) => Project[];
  getProjectTasks: (projectId: string) => Promise<Task[]>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PostgrestError | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile) {
      fetchProjects();
    } else {
      setProjects([]);
      setLoading(false);
    }
  }, [user, profile]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      let query = supabase.from("projects").select(`
        *,
        owner:owner_id(*),
        assignee:assignee_id(*)
      `);

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const projectsWithTypedStatus = data.map(project => ({
          ...project,
          id: project.id,
          title: project.title,
          description: project.description,
          ownerId: project.owner_id,
          assigneeId: project.assignee_id,
          // Ensure status is one of the allowed values in the Project type
          status: project.status as "draft" | "open" | "in_progress" | "review" | "completed",
          tasks: [],
          documents: [],
          packId: project.pack_id,
          price: project.price,
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at)
        }));
        
        setProjects(projectsWithTypedStatus);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err as PostgrestError);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (project: Partial<Project>): Promise<Project | null> => {
    try {
      if (!user) throw new Error("User not authenticated");

      const newProject = {
        title: project.title || "",
        description: project.description || "",
        owner_id: user.id,
        status: "draft" as "draft" | "open" | "in_progress" | "review" | "completed",
        pack_id: project.packId,
        price: project.price,
      };

      const { data, error } = await supabase
        .from("projects")
        .insert(newProject)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newProject: Project = {
          id: data.id,
          title: data.title,
          description: data.description,
          ownerId: data.owner_id,
          assigneeId: data.assignee_id,
          status: data.status as "draft" | "open" | "in_progress" | "review" | "completed",
          tasks: [],
          documents: [],
          packId: data.pack_id,
          price: data.price,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };
        
        setProjects([...projects, newProject]);
        toast({
          title: "Project Created",
          description: "Your new project has been created successfully.",
        });
        return newProject;
      }
      return null;
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Project Creation Failed",
        description: error.message || "An error occurred while creating the project.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProject = async (id: string, project: Partial<Project>) => {
    try {
      const updates = {
        title: project.title,
        description: project.description,
        assignee_id: project.assigneeId,
        status: project.status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setProjects(
        projects.map((p) =>
          p.id === id ? { ...p, ...project, updatedAt: new Date() } : p
        )
      );

      toast({
        title: "Project Updated",
        description: "Project has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating project:", error);
      toast({
        title: "Update Failed",
        description: error.message || "An error occurred while updating the project.",
        variant: "destructive",
      });
    }
  };

  const getProjectById = async (id: string): Promise<Project | null> => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          owner:owner_id(*),
          assignee:assignee_id(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        const project: Project = {
          id: data.id,
          title: data.title,
          description: data.description,
          ownerId: data.owner_id,
          assigneeId: data.assignee_id,
          status: data.status as "draft" | "open" | "in_progress" | "review" | "completed",
          tasks: [],
          documents: [],
          packId: data.pack_id,
          price: data.price,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };

        // Fetch tasks for this project
        const tasks = await getProjectTasks(id);
        project.tasks = tasks;

        // Fetch documents for this project
        const documents = await getDocuments(id);
        project.documents = documents;

        return project;
      }
      return null;
    } catch (error) {
      console.error("Error fetching project:", error);
      return null;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;

      setProjects(projects.filter((p) => p.id !== id));
      toast({
        title: "Project Deleted",
        description: "Project has been deleted successfully.",
      });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "An error occurred while deleting the project.",
        variant: "destructive",
      });
    }
  };

  const addTask = async (projectId: string, task: Partial<Task>) => {
    try {
      if (!user) throw new Error("User not authenticated");

      const newTask = {
        project_id: projectId,
        title: task.title || "",
        description: task.description || "",
        status: "todo" as "todo" | "in_progress" | "done",
        assignee_id: task.assigneeId,
        due_date: task.dueDate ? task.dueDate.toISOString() : null,
      };

      const { data, error } = await supabase.from("tasks").insert(newTask).select();

      if (error) throw error;

      if (data) {
        toast({
          title: "Task Added",
          description: "New task has been added to the project.",
        });

        // Update the local projects state with the new task
        const updatedProjects = [...projects];
        const projectIndex = updatedProjects.findIndex(p => p.id === projectId);
        
        if (projectIndex >= 0) {
          const newTask: Task = {
            id: data[0].id,
            projectId: data[0].project_id,
            title: data[0].title,
            description: data[0].description || "",
            status: data[0].status as "todo" | "in_progress" | "done",
            assigneeId: data[0].assignee_id,
            dueDate: data[0].due_date ? new Date(data[0].due_date) : undefined,
            createdAt: new Date(data[0].created_at),
            updatedAt: new Date(data[0].updated_at)
          };
          
          updatedProjects[projectIndex].tasks.push(newTask);
          setProjects(updatedProjects);
        }
      }
    } catch (error: any) {
      console.error("Error adding task:", error);
      toast({
        title: "Task Addition Failed",
        description: error.message || "An error occurred while adding the task.",
        variant: "destructive",
      });
    }
  };

  const updateTask = async (taskId: string, task: Partial<Task>) => {
    try {
      const updates = {
        title: task.title,
        description: task.description,
        status: task.status,
        assignee_id: task.assigneeId,
        due_date: task.dueDate ? task.dueDate.toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;

      // Update local state
      const updatedProjects = projects.map(project => {
        const updatedTasks = project.tasks.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              ...task,
              updatedAt: new Date()
            };
          }
          return t;
        });
        
        return {
          ...project,
          tasks: updatedTasks
        };
      });
      
      setProjects(updatedProjects);

      toast({
        title: "Task Updated",
        description: "Task has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast({
        title: "Task Update Failed",
        description: error.message || "An error occurred while updating the task.",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      // Update local state
      const updatedProjects = projects.map(project => ({
        ...project,
        tasks: project.tasks.filter(t => t.id !== taskId)
      }));
      
      setProjects(updatedProjects);

      toast({
        title: "Task Deleted",
        description: "Task has been deleted successfully.",
      });
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast({
        title: "Task Deletion Failed",
        description: error.message || "An error occurred while deleting the task.",
        variant: "destructive",
      });
    }
  };

  const uploadDocument = async (projectId: string, file: File, type: string, isDeliverable = false) => {
    try {
      if (!user) throw new Error("User not authenticated");

      // First, upload the file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${projectId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError, data: fileData } = await supabase
        .storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from('documents')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) throw new Error("Failed to get public URL");

      // Then create a record in the documents table
      const newDocument = {
        name: file.name,
        url: urlData.publicUrl,
        type: type,
        project_id: projectId,
        uploaded_by: user.id,
        is_deliverable: isDeliverable,
        status: isDeliverable ? "pending" as "pending" | "approved" | "rejected" : null,
      };

      const { data: documentData, error: documentError } = await supabase
        .from("documents")
        .insert(newDocument)
        .select()
        .single();

      if (documentError) throw documentError;

      if (documentData) {
        toast({
          title: "Document Uploaded",
          description: "Document has been uploaded successfully.",
        });

        // Update local state if needed
        const newDoc: Document = {
          id: documentData.id,
          name: documentData.name,
          url: documentData.url,
          type: documentData.type,
          projectId: documentData.project_id,
          uploadedBy: documentData.uploaded_by,
          createdAt: new Date(documentData.created_at),
          isDeliverable: documentData.is_deliverable,
          status: documentData.status as "pending" | "approved" | "rejected" | undefined,
          reviewComment: documentData.review_comment
        };

        const updatedProjects = projects.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              documents: [...project.documents, newDoc]
            };
          }
          return project;
        });
        
        setProjects(updatedProjects);
      }
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Document Upload Failed",
        description: error.message || "An error occurred while uploading the document.",
        variant: "destructive",
      });
    }
  };

  const getDocuments = async (projectId: string): Promise<Document[]> => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;

      return data.map((doc) => ({
        id: doc.id,
        name: doc.name,
        url: doc.url,
        type: doc.type,
        projectId: doc.project_id,
        uploadedBy: doc.uploaded_by,
        createdAt: new Date(doc.created_at),
        isDeliverable: doc.is_deliverable,
        status: doc.status as "pending" | "approved" | "rejected" | undefined,
        reviewComment: doc.review_comment
      }));
    } catch (error) {
      console.error("Error fetching documents:", error);
      return [];
    }
  };

  const updateDocumentStatus = async (
    documentId: string, 
    status: "pending" | "approved" | "rejected", 
    comment?: string
  ) => {
    try {
      const updates = {
        status,
        review_comment: comment
      };

      const { error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", documentId);

      if (error) throw error;

      // Update local state
      const updatedProjects = projects.map(project => {
        const updatedDocs = project.documents.map(doc => {
          if (doc.id === documentId) {
            return {
              ...doc,
              status,
              reviewComment: comment
            };
          }
          return doc;
        });
        
        return {
          ...project,
          documents: updatedDocs
        };
      });
      
      setProjects(updatedProjects);

      toast({
        title: "Document Status Updated",
        description: `Document has been ${status}.`,
      });
    } catch (error: any) {
      console.error("Error updating document status:", error);
      toast({
        title: "Status Update Failed",
        description: error.message || "An error occurred while updating the document status.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (message: Partial<Message>) => {
    try {
      if (!user) throw new Error("User not authenticated");

      const newMessage = {
        sender: user.id,
        recipient: message.recipient,
        content: message.content || "",
        project_id: message.projectId,
        document_url: message.documentUrl,
        document_type: message.documentType,
        document_name: message.documentName,
        document_status: message.documentStatus
      };

      const { error } = await supabase.from("messages").insert(newMessage);

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Message Failed",
        description: error.message || "An error occurred while sending the message.",
        variant: "destructive",
      });
    }
  };

  const getMessages = async (recipientId: string, projectId?: string): Promise<Message[]> => {
    try {
      if (!user) throw new Error("User not authenticated");

      let query = supabase
        .from("messages")
        .select("*")
        .or(`sender.eq.${user.id},recipient.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (recipientId) {
        query = query.or(`sender.eq.${recipientId},recipient.eq.${recipientId}`);
      }

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        recipient: msg.recipient,
        content: msg.content,
        read: msg.read,
        projectId: msg.project_id,
        createdAt: new Date(msg.created_at),
        documentUrl: msg.document_url,
        documentType: msg.document_type as "proposal" | "final" | "regular" | undefined,
        documentName: msg.document_name,
        documentStatus: msg.document_status as "pending" | "approved" | "rejected" | undefined
      }));
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("id", messageId);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const filterProjectsByStatus = (status: string) => {
    if (!status || status === "all") return projects;
    return projects.filter((project) => project.status === status);
  };

  const getProjectTasks = async (projectId: string): Promise<Task[]> => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((task) => ({
        id: task.id,
        projectId: task.project_id,
        title: task.title,
        description: task.description || "",
        status: task.status as "todo" | "in_progress" | "done",
        assigneeId: task.assignee_id,
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
        createdAt: new Date(task.created_at),
        updatedAt: new Date(task.updated_at)
      }));
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }
  };

  const value = {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    getProjectById,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    uploadDocument,
    getDocuments,
    updateDocumentStatus,
    sendMessage,
    getMessages,
    markMessageAsRead,
    filterProjectsByStatus,
    getProjectTasks,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};
