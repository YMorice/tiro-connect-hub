import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/context/project-context";
import { useAuth } from "@/context/auth-context";
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
import { User, Document } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

// Helper function to convert database status to display status
const convertDbStatusToDisplay = (dbStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    'STEP1': 'New',
    'STEP2': 'Proposals', 
    'STEP3': 'Selection',
    'STEP4': 'Payment',
    'STEP5': 'Active',
    'STEP6': 'In progress'
  };
  return statusMap[dbStatus] || dbStatus;
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { projects, updateProject, addTask, updateTask, deleteTask, addDocument, deleteDocument } = useProjects();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [newDocumentName, setNewDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentShown, setPaymentShown] = useState<boolean>(false);
  const [proposedStudents, setProposedStudents] = useState<User[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<Document[]>([]);

  // Fetch project and check access permissions
  useEffect(() => {
    const fetchProjectAndCheckAccess = async () => {
      if (!id || !user) return;

      try {
        setLoading(true);
        console.log('Fetching project:', id, 'for user:', user.id, 'role:', (user as any).role);

        // First try to get the project from the projects context
        const contextProject = projects && Array.isArray(projects) ? projects.find(p => p.id === id) : null;
        
        if (contextProject) {
          setProject(contextProject);
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // If not found in context, fetch from database and check access
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id_project', id)
          .single();

        if (projectError) {
          console.error('Error fetching project:', projectError);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        if (!projectData) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        console.log('Project data:', projectData);

        // Check access permissions based on user role
        let userHasAccess = false;

        if ((user as any).role === "admin") {
          userHasAccess = true;
        } else if ((user as any).role === "entrepreneur") {
          // Check if user owns this project
          const { data: entrepreneurData, error: entrepreneurError } = await supabase
            .from('entrepreneurs')
            .select('id_entrepreneur')
            .eq('id_user', user.id)
            .single();

          if (!entrepreneurError && entrepreneurData) {
            userHasAccess = projectData.id_entrepreneur === entrepreneurData.id_entrepreneur;
          }
        } else if ((user as any).role === "student") {
          // Check if student has a proposal for this project or is the selected student
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('id_student')
            .eq('id_user', user.id)
            .single();

          if (!studentError && studentData) {
            // Check if student is selected for this project
            if (projectData.selected_student === studentData.id_student) {
              userHasAccess = true;
            } else {
              // Check if student has a pending or accepted proposal
              const { data: proposalData, error: proposalError } = await supabase
                .from('proposal_to_student')
                .select('accepted')
                .eq('id_project', id)
                .eq('id_student', studentData.id_student)
                .single();

              if (!proposalError && proposalData) {
                // Student has access if proposal is pending (null) or accepted (true)
                userHasAccess = proposalData.accepted === null || proposalData.accepted === true;
              }
            }
          }
        }

        console.log('User has access:', userHasAccess);

        if (userHasAccess) {
          // Convert database project to UI format
          const uiProject = {
            id: projectData.id_project,
            title: projectData.title,
            description: projectData.description || "",
            status: convertDbStatusToDisplay(projectData.status || "STEP1"),
            ownerId: projectData.id_entrepreneur,
            assigneeId: projectData.selected_student,
            tasks: [],
            documents: [],
            createdAt: new Date(projectData.created_at),
            updatedAt: new Date(projectData.updated_at),
            packId: projectData.id_pack,
          };

          setProject(uiProject);
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }

      } catch (error) {
        console.error('Error in fetchProjectAndCheckAccess:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndCheckAccess();
  }, [id, user, projects]);

  // Fetch additional project data when project is set
  useEffect(() => {
    if (project && hasAccess) {
      // Fetch proposed students if project is open
      if (project.status === "open" && (user as any)?.role === "entrepreneur") {
        fetchProposedStudents();
      }
      // Fetch project documents from database
      fetchProjectDocuments();
    }
  }, [project, hasAccess, user?.role]);

  // Fetch documents from database for this project
  const fetchProjectDocuments = async () => {
    if (!id) return;

    try {
      const { data: documentsData, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id_project', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project documents:', error);
        return;
      }

      // Transform database documents to our Document type
      const transformedDocs: Document[] = (documentsData || []).map(doc => ({
        id: doc.id_document,
        name: doc.name,
        url: doc.link,
        type: doc.type,
        projectId: doc.id_project,
        uploadedBy: "unknown", // We don't store this in the database currently
        createdAt: new Date(doc.created_at),
      }));

      setProjectDocuments(transformedDocs);
    } catch (error) {
      console.error('Error fetching project documents:', error);
    }
  };

  // Fetch proposed students for this project
  const fetchProposedStudents = async () => {
    try {
      if (!id) {
        console.error("No project ID available");
        return;
      }

      console.log("Fetching proposed students for project:", id);
      
      // Get all proposed students for this project using the proposal_to_student table
      const { data: proposedData, error: proposedError } = await supabase
        .from('proposal_to_student')
        .select(`
          id_student,
          students (
            id_student,
            skills,
            specialty,
            users (
              id_users,
              name,
              surname,
              email
            )
          )
        `)
        .eq('id_project', id);
        
      if (proposedError) {
        console.error("Error fetching proposed students:", proposedError);
        return;
      }
      
      // Add defensive checks
      if (!proposedData || !Array.isArray(proposedData) || proposedData.length === 0) {
        console.log("No proposed students found");
        setProposedStudents([]);
        return;
      }
      
      // Transform the data to create User objects
      const proposedStudentsList = proposedData.map(proposal => {
        const student = proposal.students;
        const user = student?.users;
        
        if (!student || !user) return null;
        
        return {
          id: user.id_users,
          name: `${user.name} ${user.surname}` || "Unknown",
          email: user.email || "",
          role: "student" as const,
          skills: Array.isArray(student.skills) ? student.skills : [],
          specialty: student.specialty || "",
          createdAt: new Date(),
          isOnline: false
        };
      }).filter(Boolean); // Filter out null entries
      
      console.log("Successfully fetched proposed students:", proposedStudentsList);
      setProposedStudents(proposedStudentsList);
    } catch (error) {
      console.error("Error in fetchProposedStudents:", error);
      setProposedStudents([]);
    }
  };

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tiro-purple"></div>
        </div>
      </AppLayout>
    );
  }

  // Access denied or project not found
  if (!hasAccess || !project) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Project not found</h2>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/projects')}>
              Back to Projects
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isOwner = user?.id === project.ownerId;
  const isAssignee = user?.id === project.assigneeId;

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
      
      // Refresh project documents from database
      setTimeout(() => {
        fetchProjectDocuments();
      }, 1000);
    } else {
      toast.error("Please select a file to upload");
    }
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
        { id: "documents", label: "Documents" }
      ];
    } 
    else if (project.status === "open") {
      // For open projects, show student proposals to entrepreneurs
      if (isOwner) {
        tabsConfig = [
          { id: "student-proposals", label: "Student Proposals" },
          { id: "documents", label: "Documents" }
        ];
      } else {
        tabsConfig = [
          { id: "documents", label: "Documents" }
        ];
      }
    }
    else if (["in_progress", "review", "completed"].includes(project.status)) {
      tabsConfig = [
        { id: "tasks", label: "Tasks" },
        { id: "documents", label: "Documents" }
      ];
    }
    
    return tabsConfig;
  };

  const tabsConfig = getTabsBasedOnStatus();
  const defaultTab = tabsConfig.length > 0 ? tabsConfig[0].id : "documents";
  
  const handleSelectStudent = async (studentId: string) => {
    try {
      // Update the project assignee and status in database
      const { error } = await supabase
        .from('projects')
        .update({
          status: 'STEP6', // In progress
          selected_student: studentId
        })
        .eq('id_project', project.id);
        
      if (error) throw error;
      
      // Update in local state
      updateProject(project.id, { 
        assigneeId: studentId, 
        status: "In progress" 
      });
      
      toast.success("Student selected successfully");
    } catch (error) {
      console.error("Error selecting student:", error);
      toast.error("Failed to select student");
    }
  };

  // Combine project documents with database documents, avoiding duplicates
  const allDocuments = [
    ...project.documents,
    ...projectDocuments.filter(doc => 
      !project.documents.some(projDoc => projDoc.name === doc.name)
    )
  ];

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
            {/* Add button to go to messages */}
            <Button
              onClick={() => navigate(`/messages?projectId=${project.id}`)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <MessageCircle size={18} />
              Messages
            </Button>
            
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
            {(user as any)?.role === "student" && project.status === "open" && !isAssignee && (
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

        {tabsConfig.length > 0 && (
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
                    {project.tasks && project.tasks.length > 0 ? (
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
                    All project documents including files shared via chat and uploaded directly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Document list - now shows all documents including from chat */}
                  {allDocuments && allDocuments.length > 0 ? (
                    <div className="space-y-2 mb-6">
                      {allDocuments.map((doc) => (
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
                                {doc.type && ` • ${doc.type}`}
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
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default ProjectDetail;
