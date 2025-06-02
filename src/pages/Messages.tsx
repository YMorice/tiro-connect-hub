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
      const { data: messageGroups, error } = await supabase
        .from('message_groups')
        .select(`
          id_group,
          id_project,
          projects!inner (
            title,
            entrepreneurs (
              users!inner (name, pp_link)
            ),
            students (
              users!inner (name, pp_link)
            )
          )
        `)
        .eq('id_user', user.id);

      if (error) throw error;

      const conversationsMap = new Map();
      
      for (const group of messageGroups || []) {
        if (!group.projects) continue;
        
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', group.id_group)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          continue;
        }

        const lastMessage = messages?.[0];
        const isEntrepreneur = (user as any)?.role === 'entrepreneur';
        const isStudent = (user as any)?.role === 'student';
        
        let otherParticipant = null;
        let otherParticipantAvatar = null;
        
        if (isEntrepreneur && group.projects.students?.users) {
          otherParticipant = group.projects.students.users.name;
          otherParticipantAvatar = group.projects.students.users.pp_link;
        } else if (isStudent && group.projects.entrepreneurs?.users) {
          otherParticipant = group.projects.entrepreneurs.users.name;
          otherParticipantAvatar = group.projects.entrepreneurs.users.pp_link;
        }

        if (otherParticipant) {
          const conversation: Conversation = {
            id: group.id_group,
            projectId: group.id_project,
            projectTitle: group.projects.title,
            otherParticipant,
            otherParticipantAvatar,
            lastMessage: lastMessage?.content || 'No messages yet',
            lastMessageTime: lastMessage?.created_at || new Date().toISOString(),
            hasUnreadMessages: false
          };

          conversationsMap.set(group.id_group, conversation);
        }
      }

      // Fetch unread messages count for each conversation
      const unreadMessages = await Promise.all(
        Array.from(conversationsMap.keys()).map(async (groupId) => {
          const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('read', false)
            .neq('sender_id', user?.id);

          if (error) {
            console.error('Error fetching unread messages count:', error);
            return 0;
          }
          return count || 0;
        })
      );

      // Update conversations with unread messages status
      let index = 0;
      for (const groupId of conversationsMap.keys()) {
        const conversation = conversationsMap.get(groupId);
        if (conversation) {
          conversation.hasUnreadMessages = unreadMessages[index] > 0;
          conversationsMap.set(groupId, conversation);
          index++;
        }
      }

      const conversationsArray = Array.from(conversationsMap.values()).sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      
      setConversations(conversationsArray);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
      fetchConversations(); // Refresh conversations to update last message
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
      <div className="h-full flex flex-col lg:flex-row overflow-hidden">
        {/* Conversations List */}
        <div className={cn(
          "w-full lg:w-1/3 border-r border-gray-200 flex flex-col",
          selectedConversation && "hidden lg:flex"
        )}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Messages</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiro-primary"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    "p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedConversation?.id === conversation.id && "bg-blue-50 border-l-4 border-l-tiro-primary",
                    conversation.hasUnreadMessages && "bg-blue-25"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      {conversation.otherParticipantAvatar ? (
                        <AvatarImage 
                          src={`${conversation.otherParticipantAvatar}?t=${Date.now()}`}
                          alt={conversation.otherParticipant}
                        />
                      ) : (
                        <AvatarFallback className="bg-tiro-primary text-white">
                          {conversation.otherParticipant.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={cn(
                          "font-medium text-gray-900 truncate",
                          conversation.hasUnreadMessages && "font-bold"
                        )}>
                          {conversation.otherParticipant}
                        </h3>
                        {conversation.hasUnreadMessages && (
                          <div className="w-2 h-2 bg-tiro-primary rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.projectTitle}
                      </p>
                      <p className={cn(
                        "text-sm text-gray-400 truncate",
                        conversation.hasUnreadMessages && "text-gray-600 font-medium"
                      )}>
                        {conversation.lastMessage}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(conversation.lastMessageTime).toLocaleDateString()}
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
          "flex-1 flex flex-col",
          !selectedConversation && "hidden lg:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Avatar className="w-8 h-8">
                    {selectedConversation.otherParticipantAvatar ? (
                      <AvatarImage 
                        src={`${selectedConversation.otherParticipantAvatar}?t=${Date.now()}`}
                        alt={selectedConversation.otherParticipant}
                      />
                    ) : (
                      <AvatarFallback className="bg-tiro-primary text-white">
                        {selectedConversation.otherParticipant.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedConversation.otherParticipant}</h3>
                    <p className="text-sm text-gray-500">{selectedConversation.projectTitle}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiro-primary"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    const senderName = isOwnMessage 
                      ? 'You' 
                      : selectedConversation.otherParticipant;
                    const senderAvatar = isOwnMessage
                      ? (user as any)?.avatar || (user as any)?.pp_link
                      : selectedConversation.otherParticipantAvatar;

                    return (
                      <div
                        key={message.id_message}
                        className={cn(
                          "flex space-x-3",
                          isOwnMessage && "justify-end"
                        )}
                      >
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8">
                            {senderAvatar ? (
                              <AvatarImage 
                                src={`${senderAvatar}?t=${Date.now()}`}
                                alt={senderName}
                              />
                            ) : (
                              <AvatarFallback className="bg-tiro-primary text-white">
                                {senderName.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        )}
                        <div className={cn(
                          "max-w-xs lg:max-w-md",
                          isOwnMessage && "order-first"
                        )}>
                          <div className={cn(
                            "px-4 py-2 rounded-lg",
                            isOwnMessage 
                              ? "bg-tiro-primary text-white" 
                              : "bg-gray-100 text-gray-900"
                          )}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        {isOwnMessage && (
                          <Avatar className="w-8 h-8">
                            {senderAvatar ? (
                              <AvatarImage 
                                src={`${senderAvatar}?t=${Date.now()}`}
                                alt={senderName}
                              />
                            ) : (
                              <AvatarFallback className="bg-tiro-primary text-white">
                                {senderName.charAt(0)}
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
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiro-primary focus:border-transparent"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-tiro-primary hover:bg-tiro-primary/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
