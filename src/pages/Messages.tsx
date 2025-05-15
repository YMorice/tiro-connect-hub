import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, Clock, Check, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/context/message-context";
import { toast } from "@/components/ui/sonner";
import { useProject } from "@/context/project-context";
import { User, Message } from "@/types";

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCurrentUser }) => {
  return (
    <div className={`flex w-full py-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg p-3 text-sm w-fit max-w-[75%] ${isCurrentUser ? 'bg-tiro-purple text-white' : 'bg-gray-100 text-gray-800'}`}>
        {message.content}
      </div>
    </div>
  );
};

const Messages = () => {
  const { user } = useAuth();
  const { messages, sendMessage } = useMessages();
  const { projects } = useProject();
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (projects && projects.length > 0) {
      setCurrentProject(projects[0].id);
    }
  }, [projects]);

  useEffect(() => {
    if (currentProject) {
      const filtered = messages.filter(msg => msg.projectId === currentProject);
      setFilteredMessages(filtered);
    }
  }, [messages, currentProject]);

  const handleSendMessage = () => {
    if (!user || !currentProject) return;

    // Fixing the function call to match the signature in message-context.tsx
    // sendMessage expects (recipient, content, projectId?) parameters
    sendMessage("studentId", newMessage, currentProject);

    setNewMessage("");
  };

  return (
    <AppLayout>
      <div className="container max-w-5xl mx-auto py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Project List */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Select a project to view messages</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] w-full">
                  <div className="p-2 space-y-1">
                    {projects.map((project) => (
                      <Button
                        key={project.id}
                        variant="ghost"
                        className={`w-full justify-start ${currentProject === project.id ? 'text-tiro-purple font-semibold' : ''}`}
                        onClick={() => setCurrentProject(project.id)}
                      >
                        {project.title}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Messages */}
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Chat with the student about this project</CardDescription>
              </CardHeader>
              <CardContent className="h-[500px] flex flex-col">
                <ScrollArea className="flex-grow mb-4">
                  <div className="space-y-2">
                    {filteredMessages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isCurrentUser={message.sender === user?.id}
                      />
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center space-x-2">
                  <Textarea
                    placeholder="Type your message here..."
                    className="flex-grow"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button onClick={handleSendMessage}>
                    Send <Send className="ml-2 h-4 w-4" />
                  </Button>
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
