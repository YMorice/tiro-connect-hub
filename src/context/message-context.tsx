import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Message } from "../types";
import { useAuth } from "./auth-context";
import { useProjects } from "./project-context";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

interface MessageGroup {
  id: string;
  projectId?: string;
  projectTitle?: string;
  lastMessage?: Message;
  unreadCount: number;
}

interface MessageContextType {
  messageGroups: MessageGroup[];
  loading: boolean;
  sendMessage: (groupId: string, content: string) => void;
  sendDocumentMessage: (groupId: string, documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => void;
  markAsRead: (messageId: string) => void;
  getGroupMessages: (groupId: string) => Message[];
  reviewDocument: (messageId: string, isApproved: boolean, comment?: string) => void;
  refreshMessages: () => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { updateProject, addDocument } = useProjects();
  const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessageGroups = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    
    try {
      console.log("Fetching message groups for user:", user.id);
      
      let userGroups: Array<{
        id_group: string;
        id_project: string;
        projects: { title: string } | null;
      }>;
      
      if (user.role === "admin") {
        // Admin users can see all message groups
        const { data: allGroups, error: groupsError } = await supabase
          .from('message_groups')
          .select(`
            id_group,
            id_project,
            projects (
              title
            )
          `);

        if (groupsError) {
          console.error('Error fetching all groups:', groupsError);
          throw groupsError;
        }

        userGroups = (allGroups || []).map(group => ({
          id_group: String(group.id_group),
          id_project: String(group.id_project),
          projects: group.projects
        }));
      } else {
        // Regular users only see their groups
        const { data: regularGroups, error: groupsError } = await supabase
          .from('message_groups')
          .select(`
            id_group,
            id_project,
            projects (
              title
            )
          `)
          .eq('id_user', user.id);

        if (groupsError) {
          console.error('Error fetching user groups:', groupsError);
          throw groupsError;
        }

        userGroups = (regularGroups || []).map(group => ({
          id_group: String(group.id_group),
          id_project: String(group.id_project),
          projects: group.projects
        }));
      }

      console.log("User groups found:", userGroups);

      if (!userGroups || userGroups.length === 0) {
        setMessageGroups([]);
        setMessages([]);
        return;
      }

      // Get unique group IDs - now properly typed
      const groupIds: string[] = [...new Set(userGroups.map(g => g.id_group))];
      
      // Get messages for these groups with ordering
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      console.log("Messages found:", messagesData?.length || 0, messagesData);

      // Transform messages
      const transformedMessages: Message[] = (messagesData || []).map(msg => ({
        id: msg.id_message,
        sender: msg.sender_id || "",
        recipient: "", // Not used in group messaging
        content: msg.content || "",
        read: msg.read || false,
        projectId: "", // Will be set based on group
        createdAt: new Date(msg.created_at),
        groupId: msg.group_id
      }));

      // Create a map of group_id to project info for easy lookup
      const groupProjectMap = new Map();
      userGroups.forEach(group => {
        if (!groupProjectMap.has(group.id_group)) {
          groupProjectMap.set(group.id_group, {
            projectId: group.id_project,
            projectTitle: group.projects?.title || "Direct Messages"
          });
        }
      });

      // Get unique groups (remove duplicates by group ID)
      const uniqueGroupIds = [...new Set(userGroups.map(g => g.id_group))];

      // Transform groups with message data and ensure proper typing
      const transformedGroups: MessageGroup[] = uniqueGroupIds.map((groupId: string) => {
        const groupMessages = transformedMessages.filter(m => m.groupId === groupId);
        const lastMessage = groupMessages[groupMessages.length - 1];
        const unreadCount = user.role === "admin" ? 0 : groupMessages.filter(m => m.sender !== user.id && !m.read).length;
        const projectInfo = groupProjectMap.get(groupId);

        return {
          id: groupId,
          projectId: projectInfo?.projectId || undefined,
          projectTitle: projectInfo?.projectTitle || "Direct Messages",
          lastMessage,
          unreadCount
        };
      });

      console.log("Transformed groups:", transformedGroups.length);
      console.log("Transformed messages:", transformedMessages.length);
      
      setMessageGroups(transformedGroups);
      setMessages(transformedMessages);
    } catch (error) {
      console.error("Error fetching message groups:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  const refreshMessages = useCallback(() => {
    fetchMessageGroups();
  }, [fetchMessageGroups]);

  useEffect(() => {
    fetchMessageGroups();
  }, [fetchMessageGroups]);

  const sendMessage = useCallback(async (groupId: string, content: string) => {
    if (!user) return;

    try {
      const messageId = uuidv4();
      
      const { error } = await supabase
        .from('messages')
        .insert({
          id_message: messageId,
          content,
          group_id: groupId,
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
        projectId: "",
        createdAt: new Date(),
        groupId
      };

      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Update the group's last message
      setMessageGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, lastMessage: newMessage }
            : group
        )
      );
      
      // Refresh messages to ensure consistency
      setTimeout(() => {
        refreshMessages();
      }, 100);
      
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  }, [user, refreshMessages]);

  const sendDocumentMessage = useCallback(async (groupId: string, documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => {
    if (!user) return;

    const { documentUrl, documentName, documentType } = documentDetails;
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
          group_id: groupId,
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
        projectId: "",
        createdAt: new Date(),
        groupId,
        documentUrl,
        documentName,
        documentType,
        documentStatus: "pending",
      };

      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Find the project ID for this group and add document to project
      const group = messageGroups.find(g => g.id === groupId);
      if (group?.projectId) {
        // Add document to the project's document list
        await supabase
          .from('documents')
          .insert({
            id_project: group.projectId,
            name: documentName,
            link: documentUrl,
            type: documentType === "regular" ? "document" : documentType
          });

        // Also add to project context for immediate UI update
        addDocument(group.projectId, {
          name: documentName,
          url: documentUrl,
          type: documentType === "regular" ? "pdf" : documentType === "proposal" ? "pdf" : "pdf"
        });
        
        if (documentType === "final") {
          updateProject(group.projectId, { status: "review" });
        }
      }
      
      // Refresh messages to ensure consistency
      setTimeout(() => {
        refreshMessages();
      }, 100);
      
      toast.success(documentType === "regular" 
        ? "Document shared" 
        : documentType === "proposal" 
          ? "Proposal sent for review" 
          : "Final deliverable submitted for approval");
    } catch (error) {
      console.error("Error sending document message:", error);
      toast.error("Failed to send document");
    }
  }, [user, addDocument, updateProject, messageGroups, refreshMessages]);

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
          
          // Find the group and project for this message
          const group = messageGroups.find(g => g.id === message.groupId);
          if (isApproved && group?.projectId) {
            updateProject(group.projectId, { status: "completed" });
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
      const message = messages.find(m => m.id === messageId);
      if (message?.groupId) {
        sendMessage(message.groupId, replyContent);
      }
      toast.info("Feedback sent to student");
    }
  }, [user, updateProject, sendMessage, messages, messageGroups]);

  const getGroupMessages = useCallback((groupId: string): Message[] => {
    return messages
      .filter(message => message.groupId === groupId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [messages]);

  return (
    <MessageContext.Provider value={{ 
      messageGroups, 
      loading, 
      sendMessage, 
      sendDocumentMessage,
      markAsRead, 
      getGroupMessages,
      reviewDocument,
      refreshMessages
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
