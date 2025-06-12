

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { useAuth } from './auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types';

interface MessageContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sendMessage: (message: Message) => Promise<void>;
  fetchMessages: (projectId?: string) => Promise<void>;
  markProjectAsCompleted: (projectId: string) => Promise<void>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return context;
};

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sendMessage = async (message: Message) => {
    try {
      // Map Message type to database schema
      const dbMessage = {
        content: message.content,
        sender_id: message.sender,
        group_id: message.groupId,
        read: message.read
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([dbMessage])
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message.");
        return;
      }

      // Map database response back to Message type
      const mappedMessage: Message = {
        id: data.id_message,
        sender: data.sender_id,
        recipient: '', // This might need to be handled differently based on your use case
        content: data.content,
        read: data.read,
        projectId: message.projectId,
        createdAt: new Date(data.created_at),
        groupId: data.group_id
      };

      setMessages(prevMessages => [...prevMessages, mappedMessage]);
      toast.success("Message sent!");
      queryClient.invalidateQueries({ queryKey: ['messages', message.projectId] });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Echec de l'envoi du message");
    }
  };

  const fetchMessages = async (projectId?: string) => {
    if (!projectId) {
      console.warn("Project ID is required to fetch messages.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          message_groups!inner(id_project)
        `)
        .eq('message_groups.id_project', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to fetch messages.");
        return;
      }

      // Map database response to Message type
      const mappedMessages: Message[] = (data || []).map(dbMessage => ({
        id: dbMessage.id_message,
        sender: dbMessage.sender_id,
        recipient: '', // This might need to be handled differently
        content: dbMessage.content,
        read: dbMessage.read,
        projectId: projectId,
        createdAt: new Date(dbMessage.created_at),
        groupId: dbMessage.group_id
      }));

      setMessages(mappedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages.");
    }
  };

  const markProjectAsCompleted = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id_project', projectId);

      if (error) throw error;

      // Update local state
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      toast.success("Project marked as completed");
    } catch (error) {
      console.error('Error marking project as completed:', error);
      toast.error("Failed to mark project as completed");
    }
  };

  const value: MessageContextType = {
    messages,
    setMessages,
    sendMessage,
    fetchMessages,
    markProjectAsCompleted,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

export default MessageProvider;

