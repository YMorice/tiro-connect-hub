
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
import { Send, FileText, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import DocumentUpload from "@/components/DocumentUpload";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedGroupId, getGroupMessages(selectedGroupId || "")]);

  // Auto-select group if projectId is provided in URL
  useEffect(() => {
    if (projectId && messageGroups.length > 0) {
      const group = messageGroups.find(g => g.projectId === projectId);
      if (group) {
        setSelectedGroupId(group.id);
        // Show toast only once when the group is found and selected
        const hasShownToast = sessionStorage.getItem(`toast-shown-${group.id}`);
        if (!hasShownToast) {
          toast.success(`Opened discussion for: ${group.projectTitle}`);
          sessionStorage.setItem(`toast-shown-${group.id}`, 'true');
        }
      }
    }
  }, [projectId, messageGroups]);

  // Clear toast flag when leaving the page
  useEffect(() => {
    return () => {
      if (selectedGroupId) {
        sessionStorage.removeItem(`toast-shown-${selectedGroupId}`);
      }
    };
  }, [selectedGroupId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !newMessage.trim()) return;
    
    sendMessage(selectedGroupId, newMessage);
    setNewMessage("");
  };

  const handleDocumentUpload = (documentUrl: string, fileName: string, documentType: "proposal" | "final" | "regular") => {
    if (!selectedGroupId) return;
    
    sendDocumentMessage(selectedGroupId, {
      documentUrl,
      documentName: fileName,
      documentType
    });
  };

  const handleReviewSubmit = (messageId: string, isApproved: boolean) => {
    reviewDocument(messageId, isApproved, reviewComment);
    setShowReviewModal(null);
    setReviewComment("");
  };

  const selectedMessages = selectedGroupId ? getGroupMessages(selectedGroupId) : [];
  const selectedGroup = messageGroups.find(g => g.id === selectedGroupId);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tiro-purple"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-200px)] flex gap-6">
        {/* Conversations List */}
        <div className="w-1/3 border-r pr-6">
          <h2 className="text-xl font-semibold mb-4">Conversations</h2>
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {messageGroups.length > 0 ? (
                messageGroups.map((group) => (
                  <Card
                    key={group.id}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedGroupId === group.id ? "border-tiro-purple bg-purple-50" : ""
                    }`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              <MessageCircle className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {group.projectTitle}
                            </h4>
                            {group.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate">
                                {group.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                        {group.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2">
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

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedGroupId ? (
            <>
              {/* Chat Header */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold">{selectedGroup?.projectTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  Project Discussion
                </p>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-4 pr-4">
                  {selectedMessages.map((message) => {
                    const isCurrentUser = message.sender === user?.id;
                    
                    if (!message.read && !isCurrentUser) {
                      markAsRead(message.id);
                    }

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isCurrentUser
                              ? "bg-tiro-purple text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          
                          {/* Document handling */}
                          {message.documentUrl && (
                            <div className="mt-2 p-2 border rounded bg-white/10">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-xs">{message.documentName}</span>
                              </div>
                              
                              {message.documentType === "final" && (user as any)?.role === "entrepreneur" && !message.documentStatus && (
                                <div className="mt-2 flex gap-2">
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
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Document Upload */}
              {(user as any)?.role === "student" && (
                <div className="mb-4">
                  <DocumentUpload onUpload={handleDocumentUpload} />
                </div>
              )}

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
