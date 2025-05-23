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
}

export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string; // entrepreneur ID
  assigneeId?: string; // student ID
  status: "STEP1" | "STEP2" | "STEP3" | "STEP4" | "STEP5" | "STEP6" | "draft" | "open" | "in_progress" | "review" | "completed"; // Support both old and new status types
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

// Add these types if they don't exist already
export interface DatabaseProject {
  id_project: string;
  name: string;
  description: string | null;
  state: 'draft' | 'open' | 'in progress' | 'completed';
  created_at: string;
  id_entrepreneur: string | null;
  id_student: string | null;
  id_pack: string | null;
  deadline: string | null;
}

export interface DatabaseDocument {
  id_document: string;
  id_project: string | null;
  name: string | null;
  type: 'proposal' | 'final_proposal' | null;
  link: string | null;
  created_at: string;
}

// Added for proposed students
export interface DatabaseProposedStudent {
  project_id: string;
  student_id: string;
  created_at: string;
}

// Create a mapping between old and new status types
export const statusMapping = {
  // Old to new
  "draft": "STEP1",
  "open": "STEP2", 
  "in_progress": "STEP5",
  "review": "STEP5",  // Will be differentiated in UI
  "completed": "STEP6",
  
  // New to old - for backwards compatibility
  "STEP1": "draft",
  "STEP2": "open",
  "STEP3": "open", // Still conceptually "open" in the old system
  "STEP4": "open", // Still conceptually "open" in the old system
  "STEP5": "in_progress",
  "STEP6": "completed"
};

// Helper function to get display name for status
export function getStatusDisplayName(status: string): string {
  switch(status) {
    case "STEP1": return "New Project";
    case "STEP2": return "Awaiting Student Acceptance";
    case "STEP3": return "Awaiting Entrepreneur Selection";
    case "STEP4": return "Awaiting Payment";
    case "STEP5": return "In Progress";
    case "STEP6": return "Completed";
    case "draft": return "Draft";
    case "open": return "Open";
    case "in_progress": return "In Progress";
    case "review": return "Under Review";
    case "completed": return "Completed";
    default: return status;
  }
}
