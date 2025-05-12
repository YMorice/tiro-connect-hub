
export type UserRole = "student" | "entrepreneur";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  skills?: string[];
  createdAt: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string; // entrepreneur ID
  assigneeId?: string; // student ID
  status: "draft" | "open" | "in_progress" | "review" | "completed";
  tasks: Task[];
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assigneeId?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  read: boolean;
  projectId?: string;
  createdAt: Date;
}

export interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  projectId: string;
  uploadedBy: string;
  createdAt: Date;
}
