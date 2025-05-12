
import React, { useState } from "react";
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
import { FileIcon, MessageCircle, Trash2 } from "lucide-react";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { projects, updateProject, addTask, updateTask, deleteTask, addDocument, deleteDocument } = useProjects();
  const { user } = useAuth();
  const { sendMessage } = useMessages();
  const navigate = useNavigate();

  const project = projects.find((p) => p.id === id);

  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [newDocument, setNewDocument] = useState({ name: "", url: "", type: "pdf" });
  const [message, setMessage] = useState("");

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
    if (!newDocument.name.trim() || !newDocument.url.trim()) return;

    addDocument(project.id, newDocument);
    setNewDocument({ name: "", url: "", type: "pdf" });
  };

  const handleMessageSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !otherUserId) return;

    sendMessage(otherUserId, message, project.id);
    setMessage("");
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
            {isOwner && project.status === "in_progress" && (
              <Button
                onClick={() => handleStatusChange("review")}
              >
                Request Review
              </Button>
            )}
            {isOwner && project.status === "review" && (
              <Button
                onClick={() => handleStatusChange("completed")}
                className="bg-green-600 hover:bg-green-700"
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
            {otherUserId && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => navigate(`/messages?user=${otherUserId}`)}
              >
                <MessageCircle size={18} />
                Message
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p>{project.description}</p>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
          </TabsList>
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

                {/* Add document form */}
                {(isOwner || isAssignee) && (
                  <form onSubmit={handleDocumentSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="documentName">Document Name</Label>
                      <Input
                        id="documentName"
                        value={newDocument.name}
                        onChange={(e) =>
                          setNewDocument({
                            ...newDocument,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter document name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="documentUrl">Document URL</Label>
                      <Input
                        id="documentUrl"
                        value={newDocument.url}
                        onChange={(e) =>
                          setNewDocument({
                            ...newDocument,
                            url: e.target.value,
                          })
                        }
                        placeholder="Enter document URL"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="documentType">Document Type</Label>
                      <select
                        id="documentType"
                        value={newDocument.type}
                        onChange={(e) =>
                          setNewDocument({
                            ...newDocument,
                            type: e.target.value,
                          })
                        }
                        className="w-full p-2 border rounded"
                      >
                        <option value="pdf">PDF</option>
                        <option value="doc">Word Document</option>
                        <option value="image">Image</option>
                        <option value="zip">ZIP Archive</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <Button type="submit">Add Document</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication">
            <Card>
              <CardHeader>
                <CardTitle>Project Communication</CardTitle>
                <CardDescription>
                  Send messages related to this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {otherUserId ? (
                  <form onSubmit={handleMessageSend} className="space-y-4">
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here"
                        className="min-h-[120px]"
                      />
                    </div>
                    <Button type="submit" className="flex items-center gap-2">
                      <MessageCircle size={18} />
                      Send Message
                    </Button>
                  </form>
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
