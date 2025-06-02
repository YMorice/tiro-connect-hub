
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/context/message-context";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Send, FileText, CheckCircle, XCircle, MessageCircle, ArrowLeft, Clock, User } from "lucide-react";
import DocumentUpload from "@/components/DocumentUpload";
import { supabase } from "@/integrations/supabase/client";

const Messages = () => {
  const { user } = useAuth();
  const { 
    messageGroups, 
    loading, 
    sendMessage, 
    sendDocumentMessage, 
    markAsRead, 
    getGroupMessages,
    reviewDocument 
  } = useMessages();
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("projectId");
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewModal, setShowReviewModal] = useState<string | null>(null);
  const [showMobileConversations, setShowMobileConversations] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedGroupId, getGroupMessages(selectedGroupId || "")]);

  // Fetch user profiles for messages
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const selectedMessages = selectedGroupId ? getGroupMessages(selectedGroupId) : [];
      const userIds = [...new Set(selectedMessages.map(msg => msg.sender))];
      
      if (userIds.length === 0) return;

      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('id_users, name, pp_link')
          .in('id_users', userIds);

        if (error) throw error;

        const profileMap: Record<string, any> = {};
        users?.forEach(user => {
          profileMap[user.id_users] = {
            name: user.name,
            avatar: user.pp_link ? `${user.pp_link}?t=${Date.now()}` : undefined
          };
        });

        setUserProfiles(profileMap);
      } catch (error) {
        console.error("Error fetching user profiles:", error);
      }
    };

    fetchUserProfiles();
  }, [selectedGroupId, getGroupMessages]);

  // Auto-select group if projectId is provided in URL
  useEffect(() => {
    if (projectId && messageGroups.length > 0) {
      const group = messageGroups.find(g => g.projectId === projectId);
      if (group) {
        setSelectedGroupId(group.id);
        setShowMobileConversations(false); // Show chat on mobile when auto-selecting
      }
    }
  }, [projectId, messageGroups]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !newMessage.trim()) return;
    
    sendMessage(selectedGroupId, newMessage);
    setNewMessage("");
  };

  const handleDocumentSubmit = (documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => {
    if (!selectedGroupId) return;
    
    sendDocumentMessage(selectedGroupId, documentDetails);
  };

  const handleReviewSubmit = (messageId: string, isApproved: boolean) => {
    reviewDocument(messageId, isApproved, reviewComment);
    setShowReviewModal(null);
    setReviewComment("");
  };

  const handleSelectConversation = (groupId: string) => {
    setSelectedGroupId(groupId);
    setShowMobileConversations(false); // Hide conversations list on mobile
  };

  const handleBackToConversations = () => {
    setShowMobileConversations(true);
    setSelectedGroupId(null);
  };

  const getUserInitials = (userId: string) => {
    const profile = userProfiles[userId];
    if (profile?.name) {
      return profile.name.charAt(0).toUpperCase();
    }
    return "U";
  };

  const selectedMessages = selectedGroupId ? getGroupMessages(selectedGroupId) : [];
  const selectedGroup = messageGroups.find(g => g.id === selectedGroupId);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tiro-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col lg:flex-row gap-0 lg:gap-6 p-4 lg:p-6">
        {/* Conversations List - Mobile: Conditional, Desktop: Always shown */}
        <div className={`
          ${showMobileConversations ? 'flex' : 'hidden'} lg:flex
          w-full lg:w-1/3 flex-col h-full lg:border-r lg:pr-6
        `}>
          <h2 className="text-xl font-semibold mb-4">Conversations</h2>
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {messageGroups.length > 0 ? (
                messageGroups.map((group) => (
                  <Card
                    key={group.id}
                    className={`cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:shadow-md ${
                      selectedGroupId === group.id ? "border-tiro-primary bg-red-50 shadow-md" : ""
                    } ${group.unreadCount > 0 ? "border-l-4 border-l-tiro-primary" : ""}`}
                    onClick={() => handleSelectConversation(group.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative">
                            <Avatar className="flex-shrink-0">
                              <AvatarFallback className={group.unreadCount > 0 ? "bg-tiro-primary text-white" : ""}>
                                <MessageCircle className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            {group.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 h-3 w-3 bg-tiro-primary rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm truncate ${group.unreadCount > 0 ? "font-semibold text-tiro-primary" : ""}`}>
                              {group.projectTitle}
                            </h4>
                            {group.lastMessage && (
                              <div className="flex items-center gap-1 mt-1">
                                <p className="text-xs text-muted-foreground truncate flex-1">
                                  {group.lastMessage.content}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {group.lastMessage.createdAt.toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {group.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2 flex-shrink-0 bg-tiro-primary hover:bg-tiro-primary">
                            {group.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-muted-foreground">No conversations yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area - Mobile: Conditional, Desktop: Always shown */}
        <div className={`
          ${!showMobileConversations ? 'flex' : 'hidden'} lg:flex
          flex-1 flex-col h-full
        `}>
          {selectedGroupId ? (
            <>
              {/* Chat Header */}
              <div className="border-b pb-4 mb-4 flex items-center gap-4 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={handleBackToConversations}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">{selectedGroup?.projectTitle}</h3>
                  <p className="text-sm text-muted-foreground">
                    Project Discussion
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-4 pr-4">
                  {selectedMessages.map((message) => {
                    const isCurrentUser = message.sender === user?.id;
                    const senderProfile = userProfiles[message.sender];
                    
                    if (!message.read && !isCurrentUser) {
                      markAsRead(message.id);
                    }

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        {/* Avatar for other users */}
                        {!isCurrentUser && (
                          <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                            {senderProfile?.avatar ? (
                              <AvatarImage 
                                src={senderProfile.avatar} 
                                alt={senderProfile?.name || "User"}
                                className="object-cover"
                                onError={(e) => {
                                  console.error("Failed to load sender avatar:", senderProfile.avatar);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <AvatarFallback className="bg-gray-300 text-gray-600 text-xs">
                                {getUserInitials(message.sender)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        )}

                        <div className={`max-w-[85%] sm:max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                          {/* Sender name for other users */}
                          {!isCurrentUser && (
                            <p className="text-xs text-muted-foreground mb-1 px-3">
                              {senderProfile?.name || "Unknown User"}
                            </p>
                          )}
                          
                          <div
                            className={`rounded-lg p-3 ${
                              isCurrentUser
                                ? "bg-tiro-primary text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p className="text-sm break-words">{message.content}</p>
                            
                            {/* Document handling */}
                            {message.documentUrl && (
                              <div className="mt-2 p-2 border rounded bg-white/10">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 flex-shrink-0" />
                                  <span className="text-xs truncate">{message.documentName}</span>
                                </div>
                                
                                {message.documentType === "final" && (user as any)?.role === "entrepreneur" && !message.documentStatus && (
                                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleReviewSubmit(message.id, true)}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setShowReviewModal(message.id)}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Request Changes
                                    </Button>
                                  </div>
                                )}
                                
                                {message.documentStatus && (
                                  <div className="mt-1">
                                    <Badge
                                      variant={message.documentStatus === "approved" ? "default" : "destructive"}
                                      className="text-xs"
                                    >
                                      {message.documentStatus === "approved" ? "Approved" : "Changes Requested"}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <p className="text-xs opacity-70 mt-1">
                              {message.createdAt.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Avatar for current user */}
                        {isCurrentUser && (
                          <Avatar className="w-8 h-8 flex-shrink-0 mt-1 order-3">
                            {user?.avatar ? (
                              <AvatarImage 
                                src={`${user.avatar}?t=${Date.now()}`} 
                                alt={user?.name || "You"}
                                className="object-cover"
                                onError={(e) => {
                                  console.error("Failed to load current user avatar:", user.avatar);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <AvatarFallback className="bg-tiro-primary text-white text-xs">
                                {user?.name?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Document Upload */}
              {(user as any)?.role === "student" && (
                <div className="mb-4 flex-shrink-0">
                  <DocumentUpload 
                    onDocumentSubmit={handleDocumentSubmit} 
                    projectId={selectedGroup?.projectId || null}
                  />
                </div>
              )}

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2 flex-shrink-0">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 min-w-0"
                />
                <Button type="submit" disabled={!newMessage.trim()} className="flex-shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-4">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500 text-sm">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Request Changes</CardTitle>
              <CardDescription>
                Provide feedback on what needs to be improved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="review-comment">Feedback</Label>
                <Textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Explain what changes are needed..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReviewSubmit(showReviewModal, false)}
                  disabled={!reviewComment.trim()}
                >
                  Send Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};

export default Messages;
