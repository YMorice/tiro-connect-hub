
import React, { createContext, useContext, useState } from "react";
import { Message } from "../types";
import { useAuth } from "./auth-context";
import { useProjects } from "./project-context";
import { toast } from "@/components/ui/sonner";

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
  const { projects, updateProject } = useProjects();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [loading, setLoading] = useState(false);

  const sendMessage = (recipient: string, content: string, projectId?: string) => {
    if (!user) return;

    const newMessage: Message = {
      id: String(messages.length + 1),
      sender: user.id,
      recipient,
      content,
      read: false,
      projectId,
      createdAt: new Date(),
    };

    setMessages([...messages, newMessage]);
    toast.success("Message sent");
  };

  const sendDocumentMessage = (recipient: string, documentDetails: {
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

    const newMessage: Message = {
      id: String(messages.length + 1),
      sender: user.id,
      recipient,
      content,
      read: false,
      projectId,
      createdAt: new Date(),
      documentUrl,
      documentName,
      documentType,
      documentStatus: "pending",
    };

    setMessages([...messages, newMessage]);
    
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
  };

  const markAsRead = (messageId: string) => {
    setMessages(
      messages.map((message) => {
        if (message.id === messageId && !message.read) {
          return { ...message, read: true };
        }
        return message;
      })
    );
  };

  const reviewDocument = (messageId: string, isApproved: boolean, comment?: string) => {
    if (!user || user.role !== "entrepreneur") return;

    setMessages(
      messages.map((message) => {
        if (message.id === messageId && message.documentType === "final") {
          const updatedMessage = { 
            ...message, 
            documentStatus: isApproved ? "approved" : "rejected" 
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

    return messages.filter(
      (message) =>
        (message.sender === user.id && message.recipient === userId) ||
        (message.sender === userId && message.recipient === user.id)
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  };

  return (
    <MessageContext.Provider value={{ 
      messages, 
      loading, 
      sendMessage, 
      sendDocumentMessage,
      markAsRead, 
      getConversation,
      reviewDocument
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
