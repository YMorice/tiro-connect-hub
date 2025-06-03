
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  projectId: string;
  projectTitle: string;
  otherParticipant: string;
  otherParticipantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  hasUnreadMessages: boolean;
}

interface Message {
  id_message: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      console.log("Fetching conversations for user:", user.id, "role:", (user as any)?.role);
      
      // Get message groups for this user
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
      
      for (const group of userGroups) {
        if (!group.projects) continue;
        
        // Get latest message for this group
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

        // Get other participants in this group
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

        // Determine other participant
        let otherParticipant = null;
        let otherParticipantAvatar = null;
        
        const isEntrepreneur = (user as any)?.role === 'entrepreneur';
        
        if (isEntrepreneur && otherParticipants && otherParticipants.length > 0) {
          // Show student if available, otherwise first participant
          const studentParticipant = otherParticipants.find(p => (p.users as any)?.role === 'student');
          const targetParticipant = studentParticipant || otherParticipants[0];
          otherParticipant = (targetParticipant.users as any)?.name;
          otherParticipantAvatar = (targetParticipant.users as any)?.pp_link;
        } else if (group.projects.entrepreneurs?.users) {
          // For students or others, show entrepreneur
          otherParticipant = group.projects.entrepreneurs.users.name;
          otherParticipantAvatar = group.projects.entrepreneurs.users.pp_link;
        } else if (otherParticipants && otherParticipants.length > 0) {
          // Fallback to first participant
          otherParticipant = (otherParticipants[0].users as any)?.name;
          otherParticipantAvatar = (otherParticipants[0].users as any)?.pp_link;
        }

        if (otherParticipant) {
          // Check for unread messages
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

  const fetchMessages = useCallback(async (groupId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mark messages as read
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim(),
          read: false
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-gray-50">
        {/* Conversations List */}
        <div className={cn(
          "w-full lg:w-1/3 xl:w-1/4 border-r border-gray-200 flex flex-col bg-white",
          selectedConversation && "hidden lg:flex"
        )}>
          <div className="p-3 lg:p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold">Messages</h2>
          </div>
          
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

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col bg-white min-w-0",
          !selectedConversation && "hidden lg:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
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

              {/* Messages */}
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

              {/* Message Input */}
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
