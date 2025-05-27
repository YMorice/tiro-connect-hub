
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
import { Message } from "@/types";
import DocumentUpload from "@/components/DocumentUpload";
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

const Messages = () => {
  const { user } = useAuth();
  const { messageGroups, sendMessage, sendDocumentMessage, markAsRead, getGroupMessages, loading } = useMessages();
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Extract query parameters for project-specific messaging
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('projectId');
    
    if (projectId && messageGroups.length > 0) {
      const projectGroup = messageGroups.find(g => g.projectId === projectId);
      if (projectGroup) {
        setCurrentGroupId(projectGroup.id);
      }
    }
  }, [location.search, messageGroups]);

  // Auto-select first group if none selected
  useEffect(() => {
    if (!currentGroupId && messageGroups.length > 0) {
      setCurrentGroupId(messageGroups[0].id);
    }
  }, [currentGroupId, messageGroups]);

  // Filter messages based on current group
  useEffect(() => {
    if (!currentGroupId || !user) return;

    const groupMessages = getGroupMessages(currentGroupId);
    setFilteredMessages(groupMessages);
    
    // Mark unread messages as read
    groupMessages.forEach(message => {
      if (message.sender !== user.id && !message.read) {
        markAsRead(message.id);
      }
    });
  }, [currentGroupId, getGroupMessages, user, markAsRead]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  const handleSendMessage = () => {
    if (!user || !currentGroupId || !newMessage.trim()) return;

    sendMessage(currentGroupId, newMessage);
    setNewMessage("");
  };

  const handleDocumentSubmit = (documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => {
    if (!user || !currentGroupId) return;
    
    sendDocumentMessage(currentGroupId, documentDetails);
    toast.success("Document shared");
  };

  const handleGroupSelect = (groupId: string) => {
    setCurrentGroupId(groupId);
    if (isMobile) {
      setSheetOpen(false);
    }
  };

  const currentGroup = messageGroups.find(g => g.id === currentGroupId);

  const GroupsList = () => (
    <div className="h-full">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">Message Groups</CardTitle>
        <CardDescription>Your project discussions</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] md:h-[calc(100vh-240px)] w-full">
          <div className="p-2 space-y-1">
            {messageGroups.length > 0 ? (
              messageGroups.map((group) => (
                <Button
                  key={group.id}
                  variant="ghost"
                  className={`w-full justify-start text-left p-3 h-auto ${
                    currentGroupId === group.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleGroupSelect(group.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{group.projectTitle}</span>
                        {group.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 ml-2">
                            {group.unreadCount}
                          </span>
                        )}
                      </div>
                      {group.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {group.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                {loading ? "Loading groups..." : "No message groups yet"}
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
          {/* Mobile Groups List as Slide-over */}
          {isMobile && (
            <div className="md:hidden mb-2">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full flex justify-between items-center">
                    <span>
                      {currentGroup 
                        ? currentGroup.projectTitle
                        : "Select Group"}
                    </span>
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[80%] sm:w-[380px] p-0">
                  <Card className="h-full border-0">
                    <GroupsList />
                  </Card>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Desktop Groups List */}
          <div className="hidden md:block md:col-span-1">
            <Card className="h-full">
              <GroupsList />
            </Card>
          </div>

          {/* Messages */}
          <div className="md:col-span-3">
            <Card className="h-full">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  {currentGroup && (
                    <>
                      <Users className="h-5 w-5 text-blue-600" />
                      {currentGroup.projectTitle}
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {currentGroup 
                    ? "Project group discussion" 
                    : "Select a group to start messaging"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100vh-240px)] flex flex-col p-3 sm:p-4">
                {currentGroup ? (
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
                          projectId={currentGroup.projectId}
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
                          ? "Tap 'Select Group' above to choose a group"
                          : "Select a message group to start messaging"}
                      </p>
                      {messageGroups.length === 0 && !loading && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Message groups will appear when projects are created
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
