import React, { createContext, useContext, useState, useEffect } from "react";
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
  const { projects, updateProject, addDocument } = useProjects();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch messages from database
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      setLoading(true);
      
      try {
        // Get all projects accessible to the user
        let projectIds: string[] = [];
        
        if (user.role === 'admin') {
          // Admin can access all projects
          const { data: allProjects } = await supabase
            .from('projects')
            .select('id_project');
            
          projectIds = allProjects?.map(p => p.id_project) || [];
        } else if (user.role === 'entrepreneur') {
          // Entrepreneur can access their own projects
          const { data: ownedProjects } = await supabase
            .from('projects')
            .select('id_project')
            .eq('id_entrepreneur', user.id);
            
          projectIds = ownedProjects?.map(p => p.id_project) || [];
        } else if (user.role === 'student') {
          // Student can access projects they're assigned to
          const { data: assignedProjects } = await supabase
            .from('project_assignments')
            .select('id_project')
            .eq('id_student', user.id);
            
          projectIds = assignedProjects?.map(p => p.id_project) || [];
        }

        if (projectIds.length === 0) {
          setMessages([]);
          setLoading(false);
          return;
        }

        // Get messages for all accessible projects
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id_message,
            content,
            project_id,
            sender_id,
            read,
            created_at
          `)
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
          // Document-related fields would need to be added if we store them in the database
        }));

        setMessages(transformedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [user]);

  const sendMessage = async (recipient: string, content: string, projectId?: string) => {
    if (!user || !projectId) return;

    try {
      // Generate a UUID for the message
      const messageId = uuidv4();
      
      // Insert the message into the database
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
      
      // Add message to local state
      const newMessage: Message = {
        id: messageId,
        sender: user.id,
        recipient: "", // Not used in project-based messaging
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
  };

  const sendDocumentMessage = async (recipient: string, documentDetails: {
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
      // Generate a UUID for the message
      const messageId = uuidv4();
      
      // Insert the message into the database
      const { error } = await supabase
        .from('messages')
        .insert({
          id_message: messageId,
          content,
          project_id: projectId,
          sender_id: user.id,
          read: false
          // We'll need to extend the database schema to include document fields
        });
        
      if (error) throw error;
      
      // Add message to local state with document info
      const newMessage: Message = {
        id: messageId,
        sender: user.id,
        recipient: "",  // Not used in project-based messaging
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
      
      // If a project ID is specified, also add the document to the project
      if (projectId) {
        // This would ideally be stored in the database as well
        addDocument(projectId, {
          name: documentName,
          url: documentUrl,
          type: documentType === "regular" ? "pdf" : documentType === "proposal" ? "pdf" : "pdf"
        });
      }
      
      if (documentType === "final" && projectId) {
        // If it's a final deliverable, update the project status to review
        const project = projects.find(p => p.id === projectId);
        if (project && project.status === "in_progress") {
          updateProject(projectId, { status: "review" });
        }
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
  };

  const markAsRead = async (messageId: string) => {
    try {
      // Update the message in the database
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id_message', messageId);
        
      if (error) throw error;
      
      // Update local state
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
  };

  const reviewDocument = (messageId: string, isApproved: boolean, comment?: string) => {
    if (!user || user.role !== "entrepreneur") return;

    setMessages(
      messages.map((message) => {
        if (message.id === messageId && message.documentType === "final") {
          // Ensure we're setting the correct type for documentStatus
          const status: "approved" | "rejected" = isApproved ? "approved" : "rejected";
          
          const updatedMessage: Message = { 
            ...message, 
            documentStatus: status
          };
          
          // If it's approved and there's a project, mark it as completed
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
  };

  const getConversation = (userId: string): Message[] => {
    if (!user) return [];

    // In project-based messaging, this would need to be rethought
    // For backward compatibility, we'll keep it but modify the logic
    return messages.filter(
      (message) =>
        (message.sender === user.id && message.recipient === userId) ||
        (message.sender === userId && message.recipient === user.id)
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  };

  // New method to get messages for a specific project
  const getProjectMessages = (projectId: string): Message[] => {
    return messages
      .filter(message => message.projectId === projectId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  };

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
