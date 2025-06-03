
export type UserRole = "student" | "entrepreneur" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  skills?: string[];
  specialty?: string;
  createdAt: Date;
  isOnline?: boolean;
  surname?: string;
  phone?: string;
  pp_link?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string; // entrepreneur ID
  assigneeId?: string; // student ID
  status: "completed" | "New" | "Proposals" | "Selection" | "Payment" | "Active" | "In progress"; // Updated to include new status names
  tasks: Task[];
  documents: Document[];
  packId?: string; // reference to the project pack
  price?: number; // Added to track project earnings
  createdAt: Date;
  updatedAt: Date;
  proposedStudents?: User[];
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
  documentUrl?: string; // Added for document sharing
  documentType?: "proposal" | "final" | "regular"; // Added to identify document type
  documentName?: string; // Added for document name
  documentStatus?: "pending" | "approved" | "rejected"; // Added for document approval status
  groupId?: string; // Added for group-based messaging
}

export interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  projectId: string;
  uploadedBy: string;
  createdAt: Date;
  isDeliverable?: boolean; // Added to mark final deliverables
  status?: "pending" | "approved" | "rejected"; // Added for approval status
  reviewComment?: string; // Added for entrepreneur feedback
}

export interface Review {
  id: string;
  projectId: string;
  reviewerId: string; // entrepreneur ID
  studentId: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: Date;
}

export interface RegistrationFormValues {
  name: string;
  email: string;
  password: string;
  role: "student" | "entrepreneur";
  bio?: string;
  formation?: string; // Added formation field
  skills?: string[];
  avatar?: string;
  acceptTerms?: boolean;
}

// Added for proposed students
export interface DatabaseProposedStudent {
  project_id: string;
  student_id: string;
  created_at: string;
}
