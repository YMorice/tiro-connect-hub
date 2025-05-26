import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Message } from "../types";
import { useAuth } from "./auth-context";
import { useProjects } from "./project-context";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

interface MessageContextType {
  messages: Message[];
  loading: boolean;
  sendMessage: (recipient: string, content: string, projectId?: string) => void;
  sendDocumentMessage: (recipient: string, documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
    projectId?: string;
  }) => void;
  markAsRead: (messageId: string) => void;
  getConversation: (userId: string) => Message[];
  reviewDocument: (messageId: string, isApproved: boolean, comment?: string) => void;
  getProjectMessages: (projectId: string) => Message[];
}

// Mock messages for demonstration
const mockMessages: Message[] = [
  {
    id: "1",
    sender: "1", // entrepreneur 
    recipient: "2", // student
    content: "Hi, I'm interested in working with you on my e-commerce project.",
    read: true,
    projectId: "1",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
  {
    id: "2",
    sender: "2", // student
    recipient: "1", // entrepreneur
    content: "Thanks for reaching out! I'd be happy to discuss the details of your project.",
    read: true,
    projectId: "1",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 1000 * 60 * 30), // 3 days ago + 30 mins
  },
  {
    id: "3",
    sender: "1", // entrepreneur
    recipient: "2", // student
    content: "Great! I've attached the project brief for your review. Let me know if you have any questions.",
    read: false,
    projectId: "1",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  },
];

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { updateProject, addDocument } = useProjects();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    
    try {
      let projectIds: string[] = [];
      
      if ((user as any).role === 'admin') {
        // Admin can access all projects
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id_project');
          
        projectIds = allProjects?.map(p => p.id_project) || [];
      } else if ((user as any).role === 'entrepreneur') {
        // Get entrepreneur projects
        const { data: entrepreneurData } = await supabase
          .from('entrepreneurs')
          .select(`
            id_entrepreneur,
            projects (id_project)
          `)
          .eq('id_user', user.id)
          .single();
          
        projectIds = entrepreneurData?.projects?.map(p => p.id_project) || [];
      } else if ((user as any).role === 'student') {
        // Get student assigned projects
        const { data: studentData } = await supabase
          .from('students')
          .select(`
            id_student,
            project_assignments (id_project)
          `)
          .eq('id_user', user.id)
          .single();
          
        projectIds = studentData?.project_assignments?.map(pa => pa.id_project) || [];
      }

      if (projectIds.length === 0) {
        setMessages([]);
        return;
      }

      // Get messages for all accessible projects
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform database messages to our app's Message type
      const transformedMessages: Message[] = data.map(msg => ({
        id: msg.id_message,
        sender: msg.sender_id,
        recipient: "", // No direct recipient in project-based messaging
        content: msg.content,
        read: msg.read || false,
        projectId: msg.project_id,
        createdAt: new Date(msg.created_at),
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [user?.id, (user as any)?.role]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async (recipient: string, content: string, projectId?: string) => {
    if (!user || !projectId) return;

    try {
      const messageId = uuidv4();
      
      const { error } = await supabase
        .from('messages')
        .insert({
          id_message: messageId,
          content,
          project_id: projectId,
          sender_id: user.id,
          read: false
        });
        
      if (error) throw error;
      
      const newMessage: Message = {
        id: messageId,
        sender: user.id,
        recipient: "",
        content,
        read: false,
        projectId,
        createdAt: new Date(),
      };

      setMessages(prevMessages => [...prevMessages, newMessage]);
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  }, [user]);

  const sendDocumentMessage = useCallback(async (recipient: string, documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
    projectId?: string;
  }) => {
    if (!user) return;

    const { documentUrl, documentName, documentType, projectId } = documentDetails;
    const content = documentType === "regular" 
      ? `Shared a document: ${documentName}`
      : documentType === "proposal" 
        ? "Shared a project proposal for your review"
        : "Shared a final deliverable for your approval";

    try {
      const messageId = uuidv4();
      
      const { error } = await supabase
        .from('messages')
        .insert({
          id_message: messageId,
          content,
          project_id: projectId,
          sender_id: user.id,
          read: false
        });
        
      if (error) throw error;
      
      const newMessage: Message = {
        id: messageId,
        sender: user.id,
        recipient: "",
        content,
        read: false,
        projectId,
        createdAt: new Date(),
        documentUrl,
        documentName,
        documentType,
        documentStatus: "pending",
      };

      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      if (projectId) {
        addDocument(projectId, {
          name: documentName,
          url: documentUrl,
          type: documentType === "regular" ? "pdf" : documentType === "proposal" ? "pdf" : "pdf"
        });
      }
      
      if (documentType === "final" && projectId) {
        updateProject(projectId, { status: "review" });
      }
      
      toast.success(documentType === "regular" 
        ? "Document shared" 
        : documentType === "proposal" 
          ? "Proposal sent for review" 
          : "Final deliverable submitted for approval");
    } catch (error) {
      console.error("Error sending document message:", error);
      toast.error("Failed to send document");
    }
  }, [user, addDocument, updateProject]);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id_message', messageId);
        
      if (error) throw error;
      
      setMessages(prevMessages =>
        prevMessages.map(message => {
          if (message.id === messageId && !message.read) {
            return { ...message, read: true };
          }
          return message;
        })
      );
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  }, []);

  const reviewDocument = useCallback((messageId: string, isApproved: boolean, comment?: string) => {
    if (!user || (user as any).role !== "entrepreneur") return;

    setMessages(prevMessages =>
      prevMessages.map((message) => {
        if (message.id === messageId && message.documentType === "final") {
          const status: "approved" | "rejected" = isApproved ? "approved" : "rejected";
          
          const updatedMessage: Message = { 
            ...message, 
            documentStatus: status
          };
          
          if (isApproved && message.projectId) {
            updateProject(message.projectId, { status: "completed" });
            toast.success("Project marked as complete!");
          }
          
          return updatedMessage;
        }
        return message;
      })
    );

    if (isApproved) {
      toast.success("Deliverable approved");
    } else {
      const replyContent = `I've reviewed your submission and it needs some adjustments: ${comment || "Please reach out to discuss further details."}`;
      sendMessage(messages.find(m => m.id === messageId)?.sender || "", replyContent, messages.find(m => m.id === messageId)?.projectId);
      toast.info("Feedback sent to student");
    }
  }, [user, updateProject, sendMessage, messages]);

  const getConversation = useCallback((userId: string): Message[] => {
    if (!user) return [];

    return messages.filter(
      (message) =>
        (message.sender === user.id && message.recipient === userId) ||
        (message.sender === userId && message.recipient === user.id)
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [user, messages]);

  const getProjectMessages = useCallback((projectId: string): Message[] => {
    return messages
      .filter(message => message.projectId === projectId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [messages]);

  return (
    <MessageContext.Provider value={{ 
      messages, 
      loading, 
      sendMessage, 
      sendDocumentMessage,
      markAsRead, 
      getConversation,
      reviewDocument,
      getProjectMessages
    }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessageProvider");
  }
  return context;
};
