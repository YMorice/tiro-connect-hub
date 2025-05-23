import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/context/project-context";
import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/context/message-context";
import AppLayout from "@/components/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { FileIcon, MessageCircle, Trash2, Download, CreditCard } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCurrentUser }) => {
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

// Mock profiles for demonstration
const mockProfiles: User[] = [
  {
    id: "101",
    email: "sam@example.com",
    name: "Sam Johnson",
    role: "student",
    bio: "Web developer specializing in React and Node.js. 3 years of experience in building responsive web applications.",
    skills: ["React", "Node.js", "TypeScript", "Tailwind CSS"],
    createdAt: new Date(),
    avatar: "https://i.pravatar.cc/150?u=101",
    isOnline: true,
  },
  {
    id: "102",
    email: "alex@example.com",
    name: "Alex Rivera",
    role: "student",
    bio: "UX/UI designer with a background in graphic design. Passionate about creating intuitive user experiences.",
    skills: ["UI/UX", "Figma", "Adobe XD", "User Testing"],
    createdAt: new Date(),
    avatar: "https://i.pravatar.cc/150?u=102",
    isOnline: false,
  },
  {
    id: "103",
    email: "jordan@example.com",
    name: "Jordan Smith",
    role: "student",
    bio: "Full-stack developer with experience in e-commerce and SaaS applications.",
    skills: ["JavaScript", "Python", "MongoDB", "Express"],
    createdAt: new Date(),
    avatar: "https://i.pravatar.cc/150?u=103",
    isOnline: true,
  },
];

const ProfileProposition: React.FC<{ profile: User, onSelect: () => void }> = ({ profile, onSelect }) => {
  return (
    <div className="p-4 border rounded-lg mb-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar>
          <AvatarImage src={profile.avatar} />
          <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{profile.name}</p>
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-1 ${profile.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span className="text-xs text-muted-foreground">{profile.isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>
      
      <p className="text-sm mb-3">{profile.bio}</p>
      
      <div className="mb-4">
        <p className="text-sm font-medium mb-2">Skills:</p>
        <div className="flex flex-wrap gap-1">
          {profile.skills?.map(skill => (
            <span 
              key={skill} 
              className="bg-gray-100 px-2 py-1 text-xs rounded"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
      
      <Button onClick={onSelect} className="w-full">
        Select Student
      </Button>
    </div>
  );
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { projects, updateProject, addTask, updateTask, deleteTask, addDocument, deleteDocument } = useProjects();
  const { user } = useAuth();
  const { messages, sendMessage, getProjectMessages } = useMessages();
  const navigate = useNavigate();

  const project = projects.find((p) => p.id === id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [newDocumentName, setNewDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [projectMessages, setProjectMessages] = useState<Message[]>([]);
  const [paymentShown, setPaymentShown] = useState<boolean>(false);
  const [proposedStudents, setProposedStudents] = useState<User[]>([]);

  useEffect(() => {
    if (id) {
      // Get all messages for this project
      const filtered = getProjectMessages(id);
      setProjectMessages(filtered);
      
      // Fetch proposed students if project is open
      if (project?.status === "open" && user?.role === "entrepreneur") {
        fetchProposedStudents();
      }
    }
  }, [messages, id, project?.status, user?.role]);

  // Fetch proposed students for this project
  const fetchProposedStudents = async () => {
    try {
      // Get all proposed students for this project
      const { data: proposedData, error: proposedError } = await supabase
        .from('proposed_student')
        .select('student_id')
        .eq('project_id', id);
        
      if (proposedError) throw proposedError;
      
      if (proposedData && proposedData.length > 0) {
        // Get student details for each proposed student
        const studentIds = proposedData.map(p => p.student_id);
        
        // First get user IDs from student IDs
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id_user, skills, specialty')
          .in('id_student', studentIds);
          
        if (studentError) throw studentError;
        
        if (studentData && studentData.length > 0) {
          // Now get user details
          const userIds = studentData.map(s => s.id_user);
          
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id_users, name, email, role')
            .in('id_users', userIds);
            
          if (userError) throw userError;
          
          if (userData) {
            // Combine the data to create User objects
            const proposedStudentsList = userData.map(user => {
              const studentInfo = studentData.find(s => s.id_user === user.id_users);
              return {
                id: user.id_users,
                name: user.name,
                email: user.email,
                role: user.role as "student",
                skills: studentInfo?.skills || [],
                specialty: studentInfo?.specialty || "",
                createdAt: new Date(),
                isOnline: false
              };
            });
            
            setProposedStudents(proposedStudentsList);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching proposed students:", error);
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [projectMessages]);

  if (!project) {
    return <div>Project not found</div>;
  }

  const isOwner = user?.id === project.ownerId;
  const isAssignee = user?.id === project.assigneeId;
  const otherUserId = isOwner ? project.assigneeId : project.ownerId;

  const handleStatusChange = (status: string) => {
    updateProject(project.id, { status: status as any });
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    addTask(project.id, {
      ...newTask,
      assigneeId: project.assigneeId || undefined,
    });
    setNewTask({ title: "", description: "" });
  };

  const handleTaskStatusChange = (taskId: string, status: "todo" | "in_progress" | "done") => {
    updateTask(project.id, taskId, { status });
  };

  const handleDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFile) {
      // If a file name is provided, use it; otherwise use the file's name
      const documentName = newDocumentName.trim() || selectedFile.name;
      
      addDocument(project.id, { name: documentName }, selectedFile);
      setSelectedFile(null);
      setNewDocumentName("");
    } else {
      toast.error("Please select a file to upload");
    }
  };

  const handleMessageSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !otherUserId) return;

    sendMessage(otherUserId, message, project.id);
    setMessage("");
  };

  const handleSelectProfile = (profileId: string) => {
    updateProject(project.id, { assigneeId: profileId, status: "in_progress" });
    toast.success("Student assigned to project");
  };

  const handleProceedToPayment = () => {
    setPaymentShown(true);
    toast.success("Payment request submitted. Please wait for admin confirmation.");
  };

  const handleDownloadInvoice = () => {
    // In a real app, this would generate or download a real invoice
    toast.success("Invoice downloaded");
  };

  const getTabsBasedOnStatus = () => {
    // Configure tabs based on project status
    let tabsConfig = [];
    
    if (project.status === "draft") {
      tabsConfig = [
        { id: "documents", label: "Documents" },
        { id: "communication", label: "Communication" }
      ];
    } 
    else if (project.status === "open") {
      // For open projects, show student proposals to entrepreneurs
      if (isOwner) {
        tabsConfig = [
          { id: "student-proposals", label: "Student Proposals" },
          { id: "documents", label: "Documents" },
          { id: "communication", label: "Communication" }
        ];
      } else {
        tabsConfig = [
          { id: "documents", label: "Documents" },
          { id: "communication", label: "Communication" }
        ];
      }
    }
    else if (["in_progress", "review", "completed"].includes(project.status)) {
      tabsConfig = [
        { id: "tasks", label: "Tasks" },
        { id: "documents", label: "Documents" },
        { id: "communication", label: "Communication" }
      ];
    }
    
    return tabsConfig;
  };

  const tabsConfig = getTabsBasedOnStatus();
  const defaultTab = tabsConfig[0].id;
  
  const handleSelectStudent = async (studentId: string) => {
    try {
      // Update the project assignee and status in database
      const { error } = await supabase
        .from('projects')
        .update({
          status: 'in_progress',
          // We would add the student ID here, but need a way to get the student ID from user ID
          // This will be handled in the updateProject function below
        })
        .eq('id_project', project.id);
        
      if (error) throw error;
      
      // Update in local state
      updateProject(project.id, { 
        assigneeId: studentId, 
        status: "in_progress" 
      });
      
      // Send message to the selected student
      sendMessage(studentId, 
        `Congratulations! You have been selected for the project: ${project.title}. You can start working on it as soon as payment is confirmed.`,
        project.id
      );
      
      toast.success("Student selected successfully");
    } catch (error) {
      console.error("Error selecting student:", error);
      toast.error("Failed to select student");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{project.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  project.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : project.status === "in_progress"
                    ? "bg-blue-100 text-blue-800"
                    : project.status === "open"
                    ? "bg-yellow-100 text-yellow-800"
                    : project.status === "review"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {project.status.replace("_", " ").toUpperCase()}
              </span>
              <span className="text-sm text-muted-foreground">
                Created on {project.createdAt.toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && project.status === "draft" && (
              <Button
                onClick={() => handleStatusChange("open")}
                className="bg-tiro-blue hover:bg-tiro-blue/90"
              >
                Publish Project
              </Button>
            )}
            {isOwner && project.status === "open" && !paymentShown && (
              <Button
                onClick={handleProceedToPayment}
                className="bg-tiro-purple hover:bg-tiro-purple/90 flex items-center gap-2"
              >
                <CreditCard size={18} />
                Pay to Launch Project
              </Button>
            )}
            {isOwner && project.status === "open" && paymentShown && (
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download size={18} />
                Download Invoice
              </Button>
            )}
            {isOwner && project.status === "review" && (
              <Button
                onClick={() => handleStatusChange("completed")}
                className="bg-green-600 hover:bg-green-700"
                variant="default"
              >
                Mark as Complete
              </Button>
            )}
            {user?.role === "student" && project.status === "open" && !isAssignee && (
              <Button
                onClick={() => {
                  updateProject(project.id, { assigneeId: user.id, status: "in_progress" });
                  toast.success("You have successfully taken this project");
                }}
                className="bg-tiro-purple hover:bg-tiro-purple/90"
              >
                Take Project
              </Button>
            )}
            {isAssignee && project.status === "review" && (
              <Button
                onClick={() => handleStatusChange("in_progress")}
              >
                Return to In Progress
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p>{project.description}</p>
        </div>

        {project.status === "open" && isOwner && paymentShown && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 text-yellow-800">Payment Pending</h2>
            <p className="mb-4">
              Your payment request has been submitted and is awaiting approval from an administrator. 
              Once approved, your project will be visible to students who can then apply to work on it.
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleDownloadInvoice}
                className="flex items-center gap-2"
              >
                <Download size={18} />
                Download Invoice
              </Button>
              <Button variant="secondary" onClick={() => navigate('/messages?user=admin')}>
                Contact Support
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${tabsConfig.length}, 1fr)` }}>
            {tabsConfig.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          
          {project.status === "open" && isOwner && (
            <TabsContent value="student-proposals">
              <Card>
                <CardHeader>
                  <CardTitle>Student Proposals</CardTitle>
                  <CardDescription>
                    Select a student to work on your project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {proposedStudents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {proposedStudents.map(student => (
                        <div key={student.id} className="p-4 border rounded-lg mb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar>
                              <AvatarImage src={student.avatar} />
                              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Specialty:</p>
                            <p className="text-sm">{student.specialty || "Not specified"}</p>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-sm font-medium mb-1">Skills:</p>
                            <div className="flex flex-wrap gap-1">
                              {student.skills?.map(skill => (
                                <span 
                                  key={skill} 
                                  className="bg-gray-100 px-2 py-1 text-xs rounded"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => handleSelectStudent(student.id)} 
                            className="w-full"
                          >
                            Select Student
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      No students have been proposed for this project yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {["in_progress", "review", "completed"].includes(project.status) && (
            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <CardTitle>Project Tasks</CardTitle>
                  <CardDescription>
                    Manage and track all tasks related to this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Task list */}
                  {project.tasks.length > 0 ? (
                    <div className="space-y-4 mb-6">
                      {project.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-4 border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                        >
                          <div>
                            <h3 className="font-medium">{task.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {task.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 self-end md:self-center">
                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleTaskStatusChange(
                                  task.id,
                                  e.target.value as any
                                )
                              }
                              className="border rounded p-1 text-sm"
                              disabled={!isOwner && !isAssignee}
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="done">Done</option>
                            </select>
                            {(isOwner || isAssignee) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTask(project.id, task.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No tasks added yet
                    </div>
                  )}

                  {/* Add task form */}
                  {(isOwner || isAssignee) && (
                    <form onSubmit={handleTaskSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="taskTitle">Task Title</Label>
                        <Input
                          id="taskTitle"
                          value={newTask.title}
                          onChange={(e) =>
                            setNewTask({ ...newTask, title: e.target.value })
                          }
                          placeholder="Enter task title"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="taskDescription">Description</Label>
                        <Textarea
                          id="taskDescription"
                          value={newTask.description}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              description: e.target.value,
                            })
                          }
                          placeholder="Enter task description"
                          className="min-h-[100px]"
                        />
                      </div>
                      <Button type="submit">Add Task</Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Project Documents</CardTitle>
                <CardDescription>
                  Share and manage all project-related files and documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Document list */}
                {project.documents.length > 0 ? (
                  <div className="space-y-2 mb-6">
                    {project.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 border rounded-lg flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <FileIcon className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded on {doc.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.url} target="_blank" rel="noreferrer">
                              View
                            </a>
                          </Button>
                          {(isOwner || isAssignee) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                deleteDocument(project.id, doc.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No documents added yet
                  </div>
                )}

                {/* Add document form - Modified to remove URL input */}
                {(isOwner || isAssignee) && (
                  <form onSubmit={handleDocumentSubmit} className="space-y-4">
                    <div className="p-4 border rounded-md bg-gray-50">
                      <h3 className="font-medium mb-4">Upload Document</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Upload from your computer</Label>
                          <FileUpload 
                            onFileSelect={(file) => setSelectedFile(file)} 
                            buttonText="Select Document"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                            maxSize={20}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="documentName">Document Name (Optional)</Label>
                          <Input
                            id="documentName"
                            value={newDocumentName}
                            onChange={(e) => setNewDocumentName(e.target.value)}
                            placeholder="Enter document name (defaults to file name)"
                          />
                        </div>
                      </div>
                    </div>
                    <Button type="submit">Add Document</Button>
                  </form>
                )}
              </CardContent>
            </TabsContent>

          <TabsContent value="communication">
            <Card>
              <CardHeader>
                <CardTitle>Project Communication</CardTitle>
                <CardDescription>
                  Messages related to this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {otherUserId ? (
                  <div className="flex flex-col h-[500px]">
                    <ScrollArea className="flex-grow mb-4 pr-2">
                      <div className="space-y-2">
                        {projectMessages.length > 0 ? (
                          projectMessages.map((msg) => (
                            <ChatMessage
                              key={msg.id}
                              message={msg}
                              isCurrentUser={msg.sender === user?.id}
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

                    <form onSubmit={handleMessageSend} className="mt-auto">
                      <div>
                        <Textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type your message here"
                          className="min-h-[80px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleMessageSend(e);
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => navigate(`/messages?user=${otherUserId}`)}
                          className="flex items-center gap-2"
                        >
                          <MessageCircle size={18} />
                          View All Messages
                        </Button>
                        <Button type="submit" className="flex items-center gap-2">
                          <MessageCircle size={18} />
                          Send Message
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {project.status === "open"
                      ? "No student has taken this project yet"
                      : "No user to message"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ProjectDetail;
