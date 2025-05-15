import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useProject } from "@/context/project-context";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Copy, MessageSquare, Plus, Upload, X } from "lucide-react";
import TaskList from "@/components/TaskList";
import FileUpload from "@/components/FileUpload";
import { Badge } from "@/components/ui/badge";
import { Document, Project, Task } from "@/types";
import { format } from 'date-fns';
import { toast } from "@/components/ui/sonner";

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { getProjectById, updateProject, addTask, uploadDocument, updateDocumentStatus } = useProject();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDeliverable, setIsDeliverable] = useState(false);
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId);
    }
  }, [projectId]);

  const fetchProjectDetails = async (id: string) => {
    const project = await getProjectById(id);
    setProject(project);
  };

  const handleStatusUpdate = (status: Project["status"]) => {
    if (!project) return;
    updateProject(project.id, { status });
    setProject({ ...project, status });
  };

  const handleAddTask = async () => {
    if (!project || !newTaskTitle) return;
    await addTask(project.id, {
      title: newTaskTitle,
      description: newTaskDescription,
    });
    setNewTaskTitle("");
    setNewTaskDescription("");
    fetchProjectDetails(projectId!);
  };

  const handleFileUpload = async (file: File, type: string) => {
    if (!project) return;
    await uploadDocument(project.id, file, type, isDeliverable);
    setSelectedFiles([]);
    setIsDeliverable(false);
    fetchProjectDetails(projectId!);
  };

  const handleDocumentStatusUpdate = async (documentId: string, status: "pending" | "approved" | "rejected") => {
    if (!project) return;
    await updateDocumentStatus(documentId, status, reviewComment);
    setReviewComment("");
    fetchProjectDetails(projectId!);
  };

  if (!project) {
    return (
      <AppLayout>
        <div>Loading project details...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-5xl mx-auto py-10">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/projects")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <X className="mr-2 h-4 w-4" />
            Back to projects
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Details */}
          <div className="lg:col-span-2">
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{project.title}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Badge>{project.packId}</Badge>
                  <Badge variant="secondary">
                    {project.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Created At
                    </h4>
                    <p>{format(project.createdAt, 'PPP')}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Updated At
                    </h4>
                    <p>{format(project.updatedAt, 'PPP')}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Owner ID
                    </h4>
                    <p>{project.ownerId}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Assignee ID
                    </h4>
                    <p>{project.assigneeId || "Not assigned"}</p>
                  </div>
                </div>

                {user?.role === "admin" && (
                  <div className="flex space-x-2">
                    <Button onClick={() => handleStatusUpdate("draft")}>
                      Set to Draft
                    </Button>
                    <Button onClick={() => handleStatusUpdate("open")}>
                      Set to Open
                    </Button>
                    <Button onClick={() => handleStatusUpdate("in_progress")}>
                      Set to In Progress
                    </Button>
                    <Button onClick={() => handleStatusUpdate("review")}>
                      Set to Review
                    </Button>
                    <Button onClick={() => handleStatusUpdate("completed")}>
                      Set to Completed
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tasks Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>Manage project tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="New Task Title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="New Task Description"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                  />
                  <Button onClick={handleAddTask}>
                    Add Task <Plus className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <TaskList tasks={project.tasks} fetchProjectDetails={() => fetchProjectDetails(projectId!)} />
              </CardContent>
            </Card>
          </div>

          {/* Files and Communication */}
          <div>
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Project-related documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Upload New Document</Label>
                    <FileUpload
                      onFileSelect={(file) => setSelectedFiles([file])}
                      buttonText="Select File"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      maxSize={10}
                    />
                    {selectedFiles.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="deliverable">Is Deliverable?</Label>
                        <input
                          type="checkbox"
                          id="deliverable"
                          className="h-4 w-4"
                          checked={isDeliverable}
                          onChange={(e) => setIsDeliverable(e.target.checked)}
                        />
                        <Button onClick={() => handleFileUpload(selectedFiles[0], "pdf")}>
                          Upload <Upload className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {project.documents.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Existing Documents
                      </h4>
                      <ScrollArea className="h-[200px] w-full">
                        <div className="space-y-1">
                          {project.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-2 rounded-md bg-secondary"
                            >
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm hover:underline"
                              >
                                {doc.name}
                              </a>
                              <div className="flex items-center space-x-2">
                                {doc.isDeliverable && (
                                  <Badge 
                                    variant={
                                      doc.status === "approved" ? "default" : 
                                      doc.status === "rejected" ? "destructive" : 
                                      "secondary"
                                    }
                                  >
                                    {doc.status?.toUpperCase()}
                                  </Badge>
                                )}
                                <Button variant="ghost" size="sm">
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No documents uploaded yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Review Section */}
            {project.status === "review" && user?.role === "entrepreneur" && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Review Deliverable</CardTitle>
                  <CardDescription>Approve or reject the final deliverable</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Add a comment (optional)"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => handleDocumentStatusUpdate(project.documents[0].id, "rejected")}>
                      Reject <X className="ml-2 h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDocumentStatusUpdate(project.documents[0].id, "approved")}>
                      Approve <Check className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Communication Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Communication</CardTitle>
                <CardDescription>
                  Discuss project details with the student
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate(`/messages?projectId=${project.id}`)}
                >
                  View Messages <MessageSquare className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProjectDetail;
