import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Clock, Check, X, FileText, Download } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/context/message-context";
import { toast } from "@/components/ui/sonner";
import { useProjects } from "@/context/project-context";
import { User, Message } from "@/types";
import DocumentUpload from "@/components/DocumentUpload";

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCurrentUser }) => {
  // Special rendering for document messages
  if (message.documentUrl) {
    return (
      <div className={`flex w-full py-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`rounded-lg p-3 text-sm w-fit max-w-[75%] ${isCurrentUser ? 'bg-tiro-purple text-white' : 'bg-gray-100 text-gray-800'}`}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <div className="flex-1">
              <p className="font-medium">{message.documentName || "Document"}</p>
              <p>{message.content}</p>
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
          </div>
        </div>
      </div>
    );
  }

  // Regular message rendering
  return (
    <div className={`flex w-full py-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg p-3 text-sm w-fit max-w-[75%] ${isCurrentUser ? 'bg-tiro-purple text-white' : 'bg-gray-100 text-gray-800'}`}>
        {message.content}
        <div className="mt-1 text-xs opacity-70">
          {message.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>
    </div>
  );
};

const Messages = () => {
  const { user } = useAuth();
  const { messages, sendMessage, sendDocumentMessage } = useMessages();
  const { projects } = useProjects();
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('project');
    if (projectId) {
      setCurrentProject(projectId);
    } else if (projects && projects.length > 0) {
      setCurrentProject(projects[0].id);
    }
  }, [location.search, projects]);

  useEffect(() => {
    if (currentProject) {
      const filtered = messages.filter(msg => msg.projectId === currentProject);
      setFilteredMessages(filtered);
    }
  }, [messages, currentProject]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  const handleSendMessage = () => {
    if (!user || !currentProject || !newMessage.trim()) return;

    sendMessage("studentId", newMessage, currentProject);
    setNewMessage("");
  };

  const handleDocumentSubmit = (documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => {
    if (!user || !currentProject) return;
    
    sendDocumentMessage("studentId", {
      documentUrl: documentDetails.documentUrl,
      documentName: documentDetails.documentName,
      documentType: documentDetails.documentType,
      projectId: currentProject,
    });
    
    toast.success("Document shared");
  };

  return (
    <AppLayout>
      <div className="container max-w-5xl mx-auto py-4 sm:py-10 px-2 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* Project List */}
          <div className="md:col-span-1 order-2 md:order-1">
            <Card className="h-full">
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Projects</CardTitle>
                <CardDescription>Select a project to view messages</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px] md:h-[400px] w-full">
                  <div className="p-2 space-y-1">
                    {projects.map((project) => (
                      <Button
                        key={project.id}
                        variant="ghost"
                        className={`w-full justify-start ${currentProject === project.id ? 'text-tiro-purple font-semibold' : ''}`}
                        onClick={() => setCurrentProject(project.id)}
                      >
                        <span className="truncate">{project.title}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Messages */}
          <div className="md:col-span-3 order-1 md:order-2">
            <Card className="h-full">
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Messages</CardTitle>
                <CardDescription>
                  {currentProject && projects.find(p => p.id === currentProject)?.title}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[500px] flex flex-col p-4">
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
                      projectId={currentProject}
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
