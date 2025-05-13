import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/context/message-context";
import { useProjects } from "@/context/project-context";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Paperclip, Send, FileCheck, FileX } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Mock users for demonstration (in a real app, this would come from an API)
const mockUsers = [
  {
    id: "1",
    name: "Jean Martin",
    role: "entrepreneur",
    avatar: "",
    isOnline: true,
  },
  {
    id: "2",
    name: "Marie Dubois",
    role: "student",
    avatar: "",
    isOnline: false,
  },
];

const Messages = () => {
  const { user } = useAuth();
  const { messages, sendMessage, sendDocumentMessage, getConversation, markAsRead, reviewDocument } = useMessages();
  const { projects } = useProjects();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSelectedUserId = queryParams.get("user") || "";

  const [selectedUserId, setSelectedUserId] = useState(initialSelectedUserId);
  const [newMessage, setNewMessage] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState<"regular" | "proposal" | "final">("regular");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewMessageId, setReviewMessageId] = useState<string | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Filter users to show contacts
  const contacts = mockUsers.filter((contact) => contact.id !== user?.id);

  const conversation = selectedUserId ? getConversation(selectedUserId) : [];

  // Get shared projects between the current user and selected user
  const sharedProjects = projects.filter(project => 
    (user?.role === "entrepreneur" && project.ownerId === user.id && project.assigneeId === selectedUserId) || 
    (user?.role === "student" && project.assigneeId === user.id && project.ownerId === selectedUserId)
  );

  // Mark messages as read when conversation changes
  useEffect(() => {
    if (selectedUserId && conversation) {
      conversation
        .filter((msg) => msg.recipient === user?.id && !msg.read)
        .forEach((msg) => markAsRead(msg.id));
    }
  }, [selectedUserId, conversation, user?.id, markAsRead]);

  // Scroll to bottom when conversation changes
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newMessage.trim()) return;

    sendMessage(selectedUserId, newMessage, selectedProjectId);
    setNewMessage("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setDocumentName(file.name);
    }
  };

  const handleSendDocument = () => {
    if (!selectedUserId || !documentName.trim() || !selectedFile) return;
    
    // Create a temporary URL for the selected file
    const documentUrl = URL.createObjectURL(selectedFile);

    sendDocumentMessage(selectedUserId, {
      documentUrl,
      documentName,
      documentType,
      projectId: selectedProjectId
    });

    // Reset state
    setSelectedFile(null);
    setDocumentName("");
    setDocumentType("regular");
    setIsAttachDialogOpen(false);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReviewDocument = (approved: boolean) => {
    if (reviewMessageId) {
      reviewDocument(reviewMessageId, approved, reviewFeedback);
      setIsReviewDialogOpen(false);
      setReviewMessageId(null);
      setReviewFeedback("");
    }
  };

  const openReviewDialog = (messageId: string) => {
    setReviewMessageId(messageId);
    setIsReviewDialogOpen(true);
  };

  const getContactName = (id: string) => {
    const contact = mockUsers.find((u) => u.id === id);
    return contact ? contact.name : "Unknown User";
  };

  // Render message function
  const renderMessage = (msg: any) => {
    const isSender = msg.sender === user?.id;
    const showDocumentReview = !isSender && 
                              msg.documentType === "final" && 
                              msg.documentStatus === "pending" && 
                              user?.role === "entrepreneur";

    return (
      <div
        key={msg.id}
        className={cn(
          "max-w-[70%] p-3 rounded-lg",
          isSender
            ? "bg-tiro-purple text-white ml-auto"
            : "bg-gray-100 mr-auto"
        )}
      >
        {msg.documentUrl ? (
          <div className="space-y-2">
            <p>{msg.content}</p>
            <div className="flex items-center gap-2 p-2 bg-white/10 rounded">
              <Paperclip className="h-4 w-4" />
              <a 
                href={msg.documentUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-sm underline"
              >
                {msg.documentName}
              </a>
            </div>
            {msg.documentStatus && (
              <div className={cn(
                "text-xs px-2 py-1 rounded inline-flex items-center gap-1",
                msg.documentStatus === "approved" 
                  ? "bg-green-100 text-green-800" 
                  : msg.documentStatus === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              )}>
                {msg.documentStatus === "approved" && <FileCheck className="h-3 w-3" />}
                {msg.documentStatus === "rejected" && <FileX className="h-3 w-3" />}
                {msg.documentStatus === "pending" ? "Pending review" : msg.documentStatus === "approved" ? "Approved" : "Needs revisions"}
              </div>
            )}
            {showDocumentReview && (
              <div className="mt-2">
                <Button 
                  size="sm" 
                  className="w-full bg-tiro-purple hover:bg-tiro-purple/90"
                  onClick={() => openReviewDialog(msg.id)}
                >
                  Review Submission
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p>{msg.content}</p>
        )}
        <p
          className={cn(
            "text-xs mt-1",
            isSender
              ? "text-white/70"
              : "text-gray-500"
          )}
        >
          {new Date(msg.createdAt).toLocaleTimeString()}
        </p>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)]">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Contacts List */}
          <Card className="col-span-1 overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Contacts</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-4rem)]">
              {contacts.length > 0 ? (
                contacts.map((contact) => {
                  const unreadCount = messages.filter(
                    (msg) => msg.sender === contact.id && msg.recipient === user?.id && !msg.read
                  ).length;

                  return (
                    <div
                      key={contact.id}
                      className={cn(
                        "p-3 border-b cursor-pointer flex items-center justify-between",
                        selectedUserId === contact.id
                          ? "bg-tiro-purple/10"
                          : "hover:bg-gray-50"
                      )}
                      onClick={() => setSelectedUserId(contact.id)}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold relative">
                          {contact.name.charAt(0)}
                          <div className={cn(
                            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                            contact.isOnline ? "bg-green-500" : "bg-gray-400"
                          )} />
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {contact.role}
                          </p>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <div className="bg-tiro-purple text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No contacts available
                </div>
              )}
            </div>
          </Card>

          {/* Conversation */}
          <Card className="col-span-1 md:col-span-3 flex flex-col">
            {selectedUserId ? (
              <>
                <div className="p-4 border-b flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-md font-semibold">
                    {getContactName(selectedUserId).charAt(0)}
                  </div>
                  <h2 className="ml-3 font-semibold">
                    {getContactName(selectedUserId)}
                  </h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversation.length > 0 ? (
                    conversation.map((msg) => renderMessage(msg))
                  ) : (
                    <div className="text-center text-muted-foreground py-10">
                      No messages yet. Start a conversation!
                    </div>
                  )}
                  <div ref={messageEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  {sharedProjects.length > 0 && (
                    <div className="mb-2">
                      <Select
                        value={selectedProjectId || ""}
                        onValueChange={(value) => setSelectedProjectId(value || undefined)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a project (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific project</SelectItem>
                          {sharedProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2"
                  >
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="flex-1 min-h-[80px]"
                    />
                    <div className="flex flex-col gap-2">
                      <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 w-10 p-0 flex items-center justify-center"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Share a Document</DialogTitle>
                            <DialogDescription>
                              {user?.role === "student" 
                                ? "Share a document with the entrepreneur. You can specify if this is a proposal or a final deliverable."
                                : "Share a document with the student."}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="fileUpload">Upload File</Label>
                              <Input
                                id="fileUpload"
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileChange}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="documentName">Document Name</Label>
                              <Input
                                id="documentName"
                                value={documentName}
                                onChange={(e) => setDocumentName(e.target.value)}
                                placeholder="Enter document name"
                              />
                            </div>
                            
                            {user?.role === "student" && selectedProjectId && (
                              <div className="space-y-2">
                                <Label>Document Type</Label>
                                <RadioGroup 
                                  value={documentType}
                                  onValueChange={(value: "regular" | "proposal" | "final") => setDocumentType(value)}
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="regular" id="regular" />
                                    <Label htmlFor="regular">Regular Document</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="proposal" id="proposal" />
                                    <Label htmlFor="proposal">Project Proposal</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="final" id="final" />
                                    <Label htmlFor="final">Final Deliverable</Label>
                                  </div>
                                </RadioGroup>
                                <p className="text-xs text-muted-foreground">
                                  {documentType === "proposal" 
                                    ? "A proposal will be reviewed by the entrepreneur before work begins." 
                                    : documentType === "final" 
                                    ? "A final deliverable will require approval from the entrepreneur to complete the project."
                                    : "A regular document will be shared without special project status changes."}
                                </p>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={handleSendDocument}
                              disabled={!selectedFile || !documentName}
                            >
                              Share Document
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-tiro-purple hover:bg-tiro-purple/90 h-10 w-10 p-0 flex items-center justify-center"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a contact to start messaging
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Deliverable</DialogTitle>
            <DialogDescription>
              Review the student's final deliverable. If it meets your requirements, approve it to complete the project. If not, provide feedback for revisions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reviewFeedback">Feedback (required for rejection)</Label>
              <Textarea
                id="reviewFeedback"
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Please provide detailed feedback..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => handleReviewDocument(false)}
              disabled={!reviewFeedback.trim()}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <FileX className="mr-2 h-4 w-4" /> Request Revisions
            </Button>
            <Button 
              onClick={() => handleReviewDocument(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileCheck className="mr-2 h-4 w-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Messages;
