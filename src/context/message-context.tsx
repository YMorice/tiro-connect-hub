
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
      const { data, error } = await supabase
        .from('messages')
        .insert([message])
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message.");
        return;
      }

      setMessages(prevMessages => [...prevMessages, data]);
      toast.success("Message sent!");
      queryClient.invalidateQueries({ queryKey: ['messages', message.projectId] });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
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
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to fetch messages.");
        return;
      }

      setMessages(data || []);
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
        .eq('id', projectId);

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
