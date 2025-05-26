import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Clock, Check, X, FileText, Download, Menu, Users, User } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/context/message-context";
import { toast } from "@/components/ui/sonner";
import { useProjects } from "@/context/project-context";
import { Message } from "@/types";
import DocumentUpload from "@/components/DocumentUpload";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCurrentUser }) => {
  // Special rendering for document messages
  if (message.documentUrl) {
    return (
      <div className={`flex w-full py-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`rounded-lg p-3 text-sm w-fit max-w-[85%] sm:max-w-[75%] ${isCurrentUser ? 'bg-tiro-purple text-white' : 'bg-gray-100 text-gray-800'}`}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{message.documentName || "Document"}</p>
              <p className="break-words">{message.content}</p>
              <div className="mt-2">
                <a 
                  href={message.documentUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className={`flex items-center gap-1 text-xs ${isCurrentUser ? 'text-white/80 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  <Download className="h-3 w-3" /> View document
                </a>
              </div>
            </div>
          </div>
          <div className="mt-1 text-xs opacity-70">
            {message.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            {message.read && <Check className="inline h-3 w-3 ml-1" />}
          </div>
        </div>
      </div>
    );
  }

  // Regular message rendering
  return (
    <div className={`flex w-full py-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg p-3 text-sm w-fit max-w-[85%] sm:max-w-[75%] break-words ${isCurrentUser ? 'bg-tiro-purple text-white' : 'bg-gray-100 text-gray-800'}`}>
        {message.content}
        <div className="mt-1 text-xs opacity-70">
          {message.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          {message.read && <Check className="inline h-3 w-3 ml-1" />}
        </div>
      </div>
    </div>
  );
};

interface ConversationItem {
  id: string;
  title: string;
  type: 'project' | 'direct';
  lastMessage?: Message;
  unreadCount: number;
  projectId?: string;
  userId?: string;
}

const Messages = () => {
  const { user } = useAuth();
  const { messages, sendMessage, sendDocumentMessage, markAsRead } = useMessages();
  const { projects } = useProjects();
  const [currentConversation, setCurrentConversation] = useState<ConversationItem | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [users, setUsers] = useState<{[key: string]: {name: string, role: string}}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Extract query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('projectId');
    const userId = queryParams.get('userId');
    
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setCurrentConversation({
          id: projectId,
          title: project.title,
          type: 'project',
          projectId,
          lastMessage: undefined,
          unreadCount: 0
        });
      }
    } else if (userId) {
      // Handle direct user conversation
      setCurrentConversation({
        id: userId,
        title: users[userId]?.name || "User",
        type: 'direct',
        userId,
        lastMessage: undefined,
        unreadCount: 0
      });
    }
  }, [location.search, projects, users]);

  // Fetch user data for direct messages
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id_users, name, role');
          
        if (error) throw error;
        
        const usersMap = data.reduce((acc, user) => {
          acc[user.id_users] = { name: user.name, role: user.role };
          return acc;
        }, {});
        
        setUsers(usersMap);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, []);

  // Build conversations list
  useEffect(() => {
    if (!user) return;

    const conversationMap = new Map<string, ConversationItem>();
    
    // Add project conversations
    const accessibleProjects = getAccessibleProjects();
    accessibleProjects.forEach(project => {
      const projectMessages = messages.filter(m => m.projectId === project.id);
      const lastMessage = projectMessages[projectMessages.length - 1];
      const unreadCount = projectMessages.filter(m => m.sender !== user.id && !m.read).length;
      
      conversationMap.set(project.id, {
        id: project.id,
        title: project.title,
        type: 'project',
        projectId: project.id,
        lastMessage,
        unreadCount
      });
    });
    
    // Add direct message conversations
    const directMessages = messages.filter(m => !m.projectId);
    directMessages.forEach(message => {
      const otherUserId = message.sender === user.id ? message.recipient : message.sender;
      if (!otherUserId) return;
      
      const existingConv = conversationMap.get(otherUserId);
      if (!existingConv || !existingConv.lastMessage || 
          new Date(message.createdAt) > new Date(existingConv.lastMessage.createdAt)) {
        
        const userMessages = directMessages.filter(m => 
          (m.sender === user.id && m.recipient === otherUserId) ||
          (m.sender === otherUserId && m.recipient === user.id)
        );
        const unreadCount = userMessages.filter(m => m.sender === otherUserId && !m.read).length;
        
        conversationMap.set(otherUserId, {
          id: otherUserId,
          title: users[otherUserId]?.name || "User",
          type: 'direct',
          userId: otherUserId,
          lastMessage: message,
          unreadCount
        });
      }
    });
    
    const sortedConversations = Array.from(conversationMap.values())
      .sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    
    setConversations(sortedConversations);
    
    // Auto-select first conversation if none selected
    if (!currentConversation && sortedConversations.length > 0) {
      setCurrentConversation(sortedConversations[0]);
    }
  }, [messages, projects, users, user]);

  // Filter messages based on current conversation
  useEffect(() => {
    if (!currentConversation || !user) return;

    let filtered: Message[] = [];
    
    if (currentConversation.type === 'project') {
      filtered = messages.filter(msg => msg.projectId === currentConversation.projectId);
    } else {
      filtered = messages.filter(msg => 
        !msg.projectId && (
          (msg.sender === user.id && msg.recipient === currentConversation.userId) ||
          (msg.sender === currentConversation.userId && msg.recipient === user.id)
        )
      );
    }
    
    setFilteredMessages(filtered);
    
    // Mark unread messages as read
    filtered.forEach(message => {
      if (message.sender !== user.id && !message.read) {
        markAsRead(message.id);
      }
    });
  }, [messages, currentConversation, user, markAsRead]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  // Get all projects the current user has access to
  const getAccessibleProjects = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return projects;
    } else if (user.role === 'entrepreneur') {
      return projects.filter(p => p.ownerId === user.id);
    } else if (user.role === 'student') {
      return projects.filter(p => p.assigneeId === user.id || p.status === 'open');
    }
    
    return [];
  };

  const handleSendMessage = () => {
    if (!user || !currentConversation || !newMessage.trim()) return;

    if (currentConversation.type === 'project') {
      sendMessage("", newMessage, currentConversation.projectId);
    } else {
      sendMessage(currentConversation.userId!, newMessage);
    }
    setNewMessage("");
  };

  const handleDocumentSubmit = (documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => {
    if (!user || !currentConversation) return;
    
    if (currentConversation.type === 'project') {
      sendDocumentMessage("", {
        documentUrl: documentDetails.documentUrl,
        documentName: documentDetails.documentName,
        documentType: documentDetails.documentType,
        projectId: currentConversation.projectId,
      });
    } else {
      // For direct messages, send as regular document
      sendDocumentMessage(currentConversation.userId!, {
        documentUrl: documentDetails.documentUrl,
        documentName: documentDetails.documentName,
        documentType: "regular",
      });
    }
    
    toast.success("Document shared");
  };

  const handleConversationSelect = (conversation: ConversationItem) => {
    setCurrentConversation(conversation);
    if (isMobile) {
      setSheetOpen(false);
    }
  };

  const ConversationsList = () => (
    <div className="h-full">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">Conversations</CardTitle>
        <CardDescription>Your messages and project discussions</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] md:h-[calc(100vh-240px)] w-full">
          <div className="p-2 space-y-1">
            {conversations.length > 0 ? (
              conversations.map((conversation) => (
                <Button
                  key={conversation.id}
                  variant="ghost"
                  className={`w-full justify-start text-left p-3 h-auto ${
                    currentConversation?.id === conversation.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleConversationSelect(conversation)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-shrink-0">
                      {conversation.type === 'project' ? (
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{conversation.title}</span>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 ml-2">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No conversations yet
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </div>
  );

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto py-2 px-2 sm:py-6 sm:px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* Mobile Conversations List as Slide-over */}
          {isMobile && (
            <div className="md:hidden mb-2">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full flex justify-between items-center">
                    <span>
                      {currentConversation 
                        ? currentConversation.title
                        : "Select Conversation"}
                    </span>
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[80%] sm:w-[380px] p-0">
                  <Card className="h-full border-0">
                    <ConversationsList />
                  </Card>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Desktop Conversations List */}
          <div className="hidden md:block md:col-span-1">
            <Card className="h-full">
              <ConversationsList />
            </Card>
          </div>

          {/* Messages */}
          <div className="md:col-span-3">
            <Card className="h-full">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  {currentConversation && (
                    <>
                      {currentConversation.type === 'project' ? (
                        <Users className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-gray-600" />
                      )}
                      {currentConversation.title}
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {currentConversation 
                    ? currentConversation.type === 'project' 
                      ? "Project discussion" 
                      : "Direct message"
                    : "Select a conversation to start messaging"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100vh-240px)] flex flex-col p-3 sm:p-4">
                {currentConversation ? (
                  <>
                    <ScrollArea className="flex-grow mb-4 pr-2">
                      <div className="space-y-2">
                        {filteredMessages.length > 0 ? (
                          filteredMessages.map((message) => (
                            <ChatMessage
                              key={message.id}
                              message={message}
                              isCurrentUser={message.sender === user?.id}
                            />
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                            No messages yet. Start the conversation!
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="flex flex-col space-y-2 mt-auto">
                      {/* Document upload button */}
                      <div className="flex justify-end">
                        <DocumentUpload
                          onDocumentSubmit={handleDocumentSubmit}
                          projectId={currentConversation.type === 'project' ? currentConversation.projectId : undefined}
                        />
                      </div>
                      
                      {/* Text message input */}
                      <div className="flex items-center space-x-2">
                        <Textarea
                          placeholder="Type your message here..."
                          className="flex-grow min-h-[60px] max-h-[120px]"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <Button onClick={handleSendMessage} className="h-[60px]">
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-muted-foreground">
                        {isMobile 
                          ? "Tap 'Select Conversation' above to choose a conversation"
                          : "Select a conversation to start messaging"}
                      </p>
                      {conversations.length === 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          You don't have any conversations yet
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
