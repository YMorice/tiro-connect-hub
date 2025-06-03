
/**
 * Messages Page Component
 * 
 * This component handles the messaging functionality of the application, allowing users
 * to view conversations and exchange messages within project contexts.
 * 
 * Features:
 * - Display list of conversations grouped by projects
 * - Real-time message viewing and sending
 * - Responsive design for mobile and desktop
 * - Message read/unread status tracking
 * - Avatar display for participants
 * 
 * The component fetches conversations based on message groups associated with projects
 * and handles different user roles (entrepreneur, student, admin) appropriately.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Interface for conversation data structure
 * Contains all necessary information to display a conversation in the list
 */
interface Conversation {
  /** Unique identifier for the conversation group */
  id: string;
  /** ID of the associated project */
  projectId: string;
  /** Title of the associated project */
  projectTitle: string;
  /** Name of the other participant in the conversation */
  otherParticipant: string;
  /** Avatar URL of the other participant (optional) */
  otherParticipantAvatar?: string;
  /** Content of the last message in the conversation */
  lastMessage: string;
  /** Timestamp of the last message */
  lastMessageTime: string;
  /** Whether there are unread messages in this conversation */
  hasUnreadMessages: boolean;
}

/**
 * Interface for individual message data structure
 */
interface Message {
  /** Unique identifier for the message */
  id_message: string;
  /** ID of the user who sent the message */
  sender_id: string;
  /** Content/text of the message */
  content: string;
  /** Timestamp when the message was created */
  created_at: string;
}

/**
 * Messages Component
 * Main component that renders the messaging interface
 */
const Messages = () => {
  const { user } = useAuth();
  
  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  /**
   * Fetches all conversations for the current user
   * 
   * This function:
   * 1. Gets all message groups the user participates in
   * 2. For each group, fetches the latest message and other participants
   * 3. Determines the appropriate display name based on user role
   * 4. Checks for unread messages
   * 5. Sorts conversations by last message time
   */
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      console.log("Fetching conversations for user:", user.id, "role:", (user as any)?.role);
      
      // Get all message groups where this user participates
      const { data: userGroups, error: groupsError } = await supabase
        .from('message_groups')
        .select(`
          id_group,
          id_project,
          projects (
            title,
            entrepreneurs (
              users (name, pp_link)
            )
          )
        `)
        .eq('id_user', user.id);

      if (groupsError) {
        console.error('Error fetching user groups:', groupsError);
        throw groupsError;
      }

      console.log("User groups found:", userGroups?.length || 0);

      if (!userGroups || userGroups.length === 0) {
        setConversations([]);
        setMessages([]);
        setLoading(false);
        return;
      }

      const conversationsMap = new Map<string, Conversation>();
      
      // Process each message group to create conversation objects
      for (const group of userGroups) {
        if (!group.projects) continue;
        
        // Get the most recent message for this group
        const { data: latestMessage, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', group.id_group)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (messageError) {
          console.error('Error fetching latest message:', messageError);
          continue;
        }

        // Get other participants in this group (excluding current user)
        const { data: otherParticipants, error: participantsError } = await supabase
          .from('message_groups')
          .select(`
            id_user,
            users (name, pp_link, role)
          `)
          .eq('id_group', group.id_group)
          .neq('id_user', user.id);

        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
          continue;
        }

        // Determine who to display as the "other participant"
        let otherParticipant = null;
        let otherParticipantAvatar = null;
        
        const isEntrepreneur = (user as any)?.role === 'entrepreneur';
        
        if (isEntrepreneur && otherParticipants && otherParticipants.length > 0) {
          // For entrepreneurs, prioritize showing students
          const studentParticipant = otherParticipants.find(p => (p.users as any)?.role === 'student');
          const targetParticipant = studentParticipant || otherParticipants[0];
          otherParticipant = (targetParticipant.users as any)?.name;
          otherParticipantAvatar = (targetParticipant.users as any)?.pp_link;
        } else if (group.projects.entrepreneurs?.users) {
          // For students/others, show the entrepreneur
          otherParticipant = group.projects.entrepreneurs.users.name;
          otherParticipantAvatar = group.projects.entrepreneurs.users.pp_link;
        } else if (otherParticipants && otherParticipants.length > 0) {
          // Fallback to first available participant
          otherParticipant = (otherParticipants[0].users as any)?.name;
          otherParticipantAvatar = (otherParticipants[0].users as any)?.pp_link;
        }

        if (otherParticipant) {
          // Check for unread messages in this conversation
          const { count: unreadCount, error: unreadError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id_group)
            .eq('read', false)
            .neq('sender_id', user.id);

          const conversation: Conversation = {
            id: group.id_group,
            projectId: group.id_project,
            projectTitle: group.projects.title,
            otherParticipant,
            otherParticipantAvatar,
            lastMessage: latestMessage?.content || 'No messages yet',
            lastMessageTime: latestMessage?.created_at || new Date().toISOString(),
            hasUnreadMessages: !unreadError && (unreadCount || 0) > 0
          };

          conversationsMap.set(group.id_group, conversation);
        }
      }

      // Sort conversations by most recent message first
      const conversationsArray = Array.from(conversationsMap.values()).sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      
      console.log("Final conversations:", conversationsArray.length);
      setConversations(conversationsArray);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [user?.id, (user as any)?.role]);

  /**
   * Fetches all messages for a specific conversation group
   * Also marks messages as read when they are viewed
   * 
   * @param groupId - The ID of the message group to fetch messages for
   */
  const fetchMessages = useCallback(async (groupId: string) => {
    setLoadingMessages(true);
    try {
      // Fetch all messages for this group in chronological order
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mark all messages in this group as read (except those sent by current user)
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('group_id', groupId)
        .neq('sender_id', user?.id);

      setMessages(data || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [user?.id]);

  /**
   * Sends a new message to the currently selected conversation
   * Refreshes the message list and conversation list after sending
   */
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    try {
      // Insert the new message into the database
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim(),
          read: false
        });

      if (error) throw error;

      // Clear the input field
      setNewMessage('');
      
      // Refresh the messages and conversations to show the new message
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  // Effect to fetch conversations when component mounts or user changes
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Effect to fetch messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-gray-50">
        {/* Conversations List - Hidden on mobile when a conversation is selected */}
        <div className={cn(
          "w-full lg:w-1/3 xl:w-1/4 border-r border-gray-200 flex flex-col bg-white",
          selectedConversation && "hidden lg:flex"
        )}>
          {/* Header for conversations list */}
          <div className="p-3 lg:p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold">Messages</h2>
          </div>
          
          {/* Scrollable conversations list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiro-primary"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    "p-3 lg:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedConversation?.id === conversation.id && "bg-blue-50 border-l-4 border-l-tiro-primary",
                    conversation.hasUnreadMessages && "bg-blue-25"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8 lg:w-10 lg:h-10 flex-shrink-0">
                      {conversation.otherParticipantAvatar ? (
                        <AvatarImage 
                          src={conversation.otherParticipantAvatar}
                          alt={conversation.otherParticipant}
                        />
                      ) : (
                        <AvatarFallback className="bg-tiro-primary text-white text-xs lg:text-sm">
                          {conversation.otherParticipant.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={cn(
                          "font-medium text-gray-900 truncate text-sm",
                          conversation.hasUnreadMessages && "font-bold"
                        )}>
                          {conversation.otherParticipant}
                        </h3>
                        {conversation.hasUnreadMessages && (
                          <div className="w-2 h-2 bg-tiro-primary rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-1">
                        {conversation.projectTitle}
                      </p>
                      <p className={cn(
                        "text-xs text-gray-400 truncate",
                        conversation.hasUnreadMessages && "text-gray-600 font-medium"
                      )}>
                        {conversation.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area - Hidden on mobile when no conversation is selected */}
        <div className={cn(
          "flex-1 flex flex-col bg-white min-w-0",
          !selectedConversation && "hidden lg:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header - Shows conversation info and back button for mobile */}
              <div className="p-3 lg:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    {selectedConversation.otherParticipantAvatar ? (
                      <AvatarImage 
                        src={selectedConversation.otherParticipantAvatar}
                        alt={selectedConversation.otherParticipant}
                      />
                    ) : (
                      <AvatarFallback className="bg-tiro-primary text-white text-sm">
                        {selectedConversation.otherParticipant.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">{selectedConversation.otherParticipant}</h3>
                    <p className="text-xs text-gray-500 truncate">{selectedConversation.projectTitle}</p>
                  </div>
                </div>
              </div>

              {/* Messages Display Area */}
              <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiro-primary"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    const senderName = isOwnMessage 
                      ? 'You' 
                      : selectedConversation.otherParticipant;
                    const senderAvatar = isOwnMessage
                      ? (user as any)?.pp_link
                      : selectedConversation.otherParticipantAvatar;

                    return (
                      <div
                        key={message.id_message}
                        className={cn(
                          "flex space-x-2 lg:space-x-3",
                          isOwnMessage && "justify-end"
                        )}
                      >
                        {/* Avatar for received messages */}
                        {!isOwnMessage && (
                          <Avatar className="w-6 h-6 lg:w-8 lg:h-8 flex-shrink-0">
                            {senderAvatar ? (
                              <AvatarImage 
                                src={senderAvatar}
                                alt={senderName}
                              />
                            ) : (
                              <AvatarFallback className="bg-tiro-primary text-white text-xs">
                                {senderName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        )}
                        {/* Message bubble */}
                        <div className={cn(
                          "max-w-xs lg:max-w-md xl:max-w-lg",
                          isOwnMessage && "order-first"
                        )}>
                          <div className={cn(
                            "px-3 py-2 rounded-lg break-words",
                            isOwnMessage 
                              ? "bg-tiro-primary text-white" 
                              : "bg-gray-100 text-gray-900"
                          )}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {/* Avatar for sent messages */}
                        {isOwnMessage && (
                          <Avatar className="w-6 h-6 lg:w-8 lg:h-8 flex-shrink-0">
                            {senderAvatar ? (
                              <AvatarImage 
                                src={senderAvatar}
                                alt={senderName}
                              />
                            ) : (
                              <AvatarFallback className="bg-tiro-primary text-white text-xs">
                                {senderName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Area */}
              <div className="p-3 lg:p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiro-primary focus:border-transparent text-sm min-w-0"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-tiro-primary hover:bg-tiro-primary/90 flex-shrink-0"
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state when no conversation is selected */
            <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
              <div className="text-center">
                <p className="text-sm">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
