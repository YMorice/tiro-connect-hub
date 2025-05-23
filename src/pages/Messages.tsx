
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Clock, Check, X, FileText, Download, Menu } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/context/message-context";
import { toast } from "@/components/ui/sonner";
import { useProjects } from "@/context/project-context";
import { User, Message } from "@/types";
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

const Messages = () => {
  const { user } = useAuth();
  const { messages, sendMessage, sendDocumentMessage, markAsRead } = useMessages();
  const { projects } = useProjects();
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<{id_project: string, id_student: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Extract query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('projectId');
    if (projectId) {
      setCurrentProject(projectId);
    } else if (projects && projects.length > 0) {
      setCurrentProject(projects[0].id);
    }
  }, [location.search, projects]);

  // Fetch project assignments for the current user if they're a student
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user || user.role !== 'student') return;
      
      try {
        const { data, error } = await supabase
          .from('project_assignments')
          .select('id_project, id_student')
          .eq('id_student', user.id);
          
        if (error) throw error;
        
        setProjectAssignments(data || []);
        
        // If no project is selected but we have assignments, select the first one
        if (!currentProject && data && data.length > 0) {
          setCurrentProject(data[0].id_project);
        }
      } catch (error) {
        console.error('Error fetching project assignments:', error);
      }
    };
    
    fetchAssignments();
  }, [user, currentProject]);

  useEffect(() => {
    if (currentProject) {
      const filtered = messages.filter(msg => msg.projectId === currentProject);
      setFilteredMessages(filtered);
      
      // Mark unread messages as read
      filtered.forEach(message => {
        if (message.sender !== user?.id && !message.read) {
          markAsRead(message.id);
        }
      });
    }
  }, [messages, currentProject, user, markAsRead]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  // Get all projects the current user has access to
  const getAccessibleProjects = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      // Admins can see all projects
      return projects;
    } else if (user.role === 'entrepreneur') {
      // Entrepreneurs can see their own projects
      return projects.filter(p => p.ownerId === user.id);
    } else if (user.role === 'student') {
      // Students can see projects they're assigned to
      const assignedProjectIds = projectAssignments.map(a => a.id_project);
      return projects.filter(p => assignedProjectIds.includes(p.id));
    }
    
    return [];
  };

  const handleSendMessage = () => {
    if (!user || !currentProject || !newMessage.trim()) return;

    // In a project context, we're not sending to a specific recipient anymore
    // Instead, all participants of the project will see the message
    sendMessage("", newMessage, currentProject);
    setNewMessage("");
  };

  const handleDocumentSubmit = (documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => {
    if (!user || !currentProject) return;
    
    sendDocumentMessage("", {
      documentUrl: documentDetails.documentUrl,
      documentName: documentDetails.documentName,
      documentType: documentDetails.documentType,
      projectId: currentProject,
    });
    
    toast.success("Document shared");
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProject(projectId);
    if (isMobile) {
      setSheetOpen(false); // Close the sheet on mobile when a project is selected
    }
  };

  const accessibleProjects = getAccessibleProjects();

  const ProjectsList = () => (
    <div className="h-full">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">Projects</CardTitle>
        <CardDescription>Select a project to view messages</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] md:h-[calc(100vh-240px)] w-full">
          <div className="p-2 space-y-1">
            {accessibleProjects.length > 0 ? (
              accessibleProjects.map((project) => (
                <Button
                  key={project.id}
                  variant="ghost"
                  className={`w-full justify-start text-left ${currentProject === project.id ? 'text-tiro-purple font-semibold' : ''}`}
                  onClick={() => handleProjectSelect(project.id)}
                >
                  <span className="truncate">{project.title}</span>
                </Button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No projects available
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </div>
  );

  return (
    <AppLayout>
      <div className="container max-w-5xl mx-auto py-2 px-2 sm:py-6 sm:px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* Mobile Project List as Slide-over */}
          {isMobile && (
            <div className="md:hidden mb-2">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full flex justify-between items-center">
                    <span>
                      {currentProject 
                        ? accessibleProjects.find(p => p.id === currentProject)?.title || "Select Project" 
                        : "Select Project"}
                    </span>
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[80%] sm:w-[380px] p-0">
                  <Card className="h-full border-0">
                    <ProjectsList />
                  </Card>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Desktop Project List */}
          <div className="hidden md:block md:col-span-1">
            <Card className="h-full">
              <ProjectsList />
            </Card>
          </div>

          {/* Messages */}
          <div className="md:col-span-3">
            <Card className="h-full">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-lg">
                  {currentProject && accessibleProjects.find(p => p.id === currentProject)?.title}
                </CardTitle>
                <CardDescription>
                  {currentProject ? "Project conversation" : "Select a project to view messages"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100vh-240px)] flex flex-col p-3 sm:p-4">
                {currentProject ? (
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
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-muted-foreground">
                        {isMobile 
                          ? "Tap 'Select Project' above to choose a project"
                          : "Select a project to view messages"}
                      </p>
                      {accessibleProjects.length === 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          You don't have any projects yet
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
