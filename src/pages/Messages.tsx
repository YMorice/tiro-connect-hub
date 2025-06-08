/**
 * Messages Page Component - Optimized for performance with proper access control
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  projectStatus: string;
}

interface Message {
  id_message: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const Messages = () => {
  const { user } = useAuth();
  
  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Memoize user info to prevent unnecessary re-renders
  const userInfo = useMemo(() => ({
    id: user?.id,
    role: (user as any)?.role,
    avatar: (user as any)?.pp_link
  }), [user?.id, (user as any)?.role, (user as any)?.pp_link]);

  /**
   * Enhanced conversation fetching with proper access control
   */
  const fetchConversations = useCallback(async () => {
    if (!userInfo.id) return;

    setLoading(true);
    try {
      console.log("Fetching conversations for user:", userInfo.id, "role:", userInfo.role);
      
      let conversationsData: any[] = [];
      
      if (userInfo.role === 'admin') {
        // Admins have access to ALL message groups
        const { data, error } = await supabase
          .from('message_groups')
          .select(`
            id_group,
            id_project,
            projects (
              title,
              status,
              id_entrepreneur,
              selected_student,
              entrepreneurs (
                users (name, pp_link)
              ),
              students!projects_selected_student_fkey (
                users (name, pp_link)
              )
            )
          `);
          
        if (error) {
          console.error('Error fetching conversations for admin:', error);
          throw error;
        }
        
        console.log('Admin conversations data:', data);
        conversationsData = data || [];
        
      } else if (userInfo.role === 'entrepreneur') {
        // Entrepreneurs can access message groups for their projects
        const { data: entrepreneurData, error: entrepreneurError } = await supabase
          .from('entrepreneurs')
          .select('id_entrepreneur')
          .eq('id_user', userInfo.id)
          .single();

        if (entrepreneurError) {
          console.error('Error fetching entrepreneur:', entrepreneurError);
          throw entrepreneurError;
        }

        console.log('Entrepreneur data:', entrepreneurData);

        if (entrepreneurData) {
          const { data, error } = await supabase
            .from('message_groups')
            .select(`
              id_group,
              id_project,
              projects!inner (
                title,
                status,
                id_entrepreneur,
                selected_student,
                entrepreneurs (
                  users (name, pp_link)
                ),
                students!projects_selected_student_fkey (
                  users (name, pp_link)
                )
              )
            `)
            .eq('projects.id_entrepreneur', entrepreneurData.id_entrepreneur);
            
          if (error) {
            console.error('Error fetching entrepreneur conversations:', error);
            throw error;
          }
          
          console.log('Entrepreneur conversations data:', data);
          conversationsData = data || [];
        }
        
      } else if (userInfo.role === 'student') {
        // Students can access discussions for projects where they are selected AND project is active
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id_student')
          .eq('id_user', userInfo.id)
          .single();

        if (studentError) {
          console.error('Error fetching student:', studentError);
          throw studentError;
        }

        console.log('Student data:', studentData);

        if (studentData) {
          // Get message groups for projects where this student is selected AND project is active
          const { data, error } = await supabase
            .from('message_groups')
            .select(`
              id_group,
              id_project,
              projects!inner (
                title,
                status,
                selected_student,
                entrepreneurs (
                  users (name, pp_link)
                )
              )
            `)
            .eq('projects.selected_student', studentData.id_student)
            .in('projects.status', ['STEP5', 'STEP6', 'completed']); // Active, In Progress, or Completed
            
          if (error) {
            console.error('Error fetching student conversations:', error);
            throw error;
          }
          
          console.log('Student conversations data:', data);
          conversationsData = data || [];
        }
      }

      if (!conversationsData || conversationsData.length === 0) {
        console.log('No conversations found');
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get all group IDs for batch processing
      const groupIds = conversationsData.map(g => g.id_group);
      console.log('Group IDs:', groupIds);
      
      // Batch fetch latest messages for all groups
      const { data: latestMessages, error: messagesError } = await supabase
        .from('messages')
        .select('group_id, content, created_at')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error fetching latest messages:', messagesError);
      }

      // Batch fetch unread counts for all groups
      const { data: unreadCounts, error: unreadError } = await supabase
        .from('messages')
        .select('group_id')
        .in('group_id', groupIds)
        .eq('read', false)
        .neq('sender_id', userInfo.id);

      if (unreadError) {
        console.error('Error fetching unread counts:', unreadError);
      }

      // Process messages and unread counts
      const messagesByGroup = new Map();
      const unreadByGroup = new Map();
      
      latestMessages?.forEach(msg => {
        if (!messagesByGroup.has(msg.group_id)) {
          messagesByGroup.set(msg.group_id, msg);
        }
      });
      
      unreadCounts?.forEach(msg => {
        unreadByGroup.set(msg.group_id, (unreadByGroup.get(msg.group_id) || 0) + 1);
      });

      const conversationsArray: Conversation[] = [];
      
      // Process each group to create conversation objects
      for (const group of conversationsData) {
        if (!group.projects) {
          console.log('Skipping group without project data:', group);
          continue;
        }
        
        const latestMessage = messagesByGroup.get(group.id_group);
        const unreadCount = unreadByGroup.get(group.id_group) || 0;

        // Determine who to display as the "other participant"
        let otherParticipant = null;
        let otherParticipantAvatar = null;
        
        if (userInfo.role === 'admin') {
          // For admins, show project title with entrepreneur name
          if (group.projects.entrepreneurs?.users) {
            otherParticipant = `${group.projects.title} (${group.projects.entrepreneurs.users.name})`;
            otherParticipantAvatar = group.projects.entrepreneurs.users.pp_link;
          } else {
            otherParticipant = group.projects.title;
          }
        } else if (userInfo.role === 'entrepreneur') {
          // For entrepreneurs, show "Admin" if no student is selected, or student name if selected and active
          if (group.projects.selected_student && group.projects.status === 'STEP5') {
            if (group.projects.students?.users) {
              otherParticipant = `${group.projects.title} - ${group.projects.students.users.name}`;
              otherParticipantAvatar = group.projects.students.users.pp_link;
            } else {
              otherParticipant = `${group.projects.title} - Admin`;
            }
          } else {
            otherParticipant = `${group.projects.title} - Admin`;
          }
        } else if (userInfo.role === 'student') {
          // For students, show the entrepreneur
          if (group.projects.entrepreneurs?.users) {
            otherParticipant = `${group.projects.title} - ${group.projects.entrepreneurs.users.name}`;
            otherParticipantAvatar = group.projects.entrepreneurs.users.pp_link;
          } else {
            otherParticipant = group.projects.title;
          }
        }

        if (otherParticipant) {
          const conversation: Conversation = {
            id: group.id_group,
            projectId: group.id_project,
            projectTitle: group.projects.title,
            projectStatus: group.projects.status,
            otherParticipant,
            otherParticipantAvatar,
            lastMessage: latestMessage?.content || 'No messages yet',
            lastMessageTime: latestMessage?.created_at || new Date().toISOString(),
            hasUnreadMessages: unreadCount > 0
          };

          conversationsArray.push(conversation);
        }
      }

      // Sort conversations: unread first, then by most recent message
      const sortedConversations = conversationsArray.sort((a, b) => {
        if (a.hasUnreadMessages && !b.hasUnreadMessages) return -1;
        if (!a.hasUnreadMessages && b.hasUnreadMessages) return 1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });
      
      console.log("Final conversations:", sortedConversations);
      setConversations(sortedConversations);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [userInfo.id, userInfo.role]);

  /**
   * Optimized message fetching
   */
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
        .neq('sender_id', userInfo.id);

      setMessages(data || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [userInfo.id]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation || !userInfo.id) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: selectedConversation.id,
          sender_id: userInfo.id,
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
  }, [newMessage, selectedConversation, userInfo.id, fetchMessages, fetchConversations]);

  // Effect to fetch conversations when component mounts or user changes
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  const conversationList = useMemo(() => {
    return conversations.map((conversation) => (
      <div
        key={conversation.id}
        onClick={() => setSelectedConversation(conversation)}
        className={cn(
          "p-3 lg:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors relative",
          selectedConversation?.id === conversation.id && "bg-blue-50 border-l-4 border-l-tiro-primary",
          conversation.hasUnreadMessages && "bg-blue-25 border-l-4 border-l-blue-500"
        )}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
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
            {conversation.hasUnreadMessages && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className={cn(
                "font-medium text-gray-900 truncate text-sm",
                conversation.hasUnreadMessages && "font-bold"
              )}>
                {conversation.otherParticipant}
              </h3>
            </div>
            <p className={cn(
              "text-xs text-gray-400 truncate",
              conversation.hasUnreadMessages && "text-gray-600 font-medium"
            )}>
              {conversation.lastMessage}
            </p>
          </div>
        </div>
      </div>
    ));
  }, [conversations, selectedConversation]);

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
              conversationList
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
                    <p className="text-xs text-gray-500 truncate">Project: {selectedConversation.projectTitle}</p>
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
                    const isOwnMessage = message.sender_id === userInfo.id;
                    const senderName = isOwnMessage 
                      ? 'You' 
                      : selectedConversation.otherParticipant;
                    const senderAvatar = isOwnMessage
                      ? userInfo.avatar
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
