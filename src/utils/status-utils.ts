
import { Project } from "@/types";

/**
 * Convert between old and new status formats
 * @param status Current status
 * @param toNewFormat Whether to convert to new format (STEP1-STEP6) or old format
 * @returns Converted status
 */
export function convertStatus(status: string, toNewFormat: boolean = true): string {
  const oldToNew: Record<string, string> = {
    "draft": "STEP1",
    "open": "STEP2",
    "in_progress": "STEP5",
    "review": "STEP5",
    "completed": "STEP6"
  };
  
  const newToOld: Record<string, string> = {
    "STEP1": "draft",
    "STEP2": "open",
    "STEP3": "open",
    "STEP4": "open",
    "STEP5": "in_progress",
    "STEP6": "completed"
  };
  
  if (toNewFormat) {
    return oldToNew[status] || status;
  } else {
    return newToOld[status] || status;
  }
}

/**
 * Get display name for status
 * @param status Project status
 * @returns Human-readable status name
 */
export function getDisplayName(status: string): string {
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

/**
 * Check if a project is in a particular stage
 * This handles both old and new status formats
 * @param project The project to check
 * @param stage The stage to check for
 */
export function isProjectInStage(project: Project, stage: string): boolean {
  // Direct match
  if (project.status === stage) return true;
  
  // Handle compatibility between old and new formats
  switch(stage) {
    case "draft": return project.status === "STEP1";
    case "open": return ["STEP2", "STEP3", "STEP4"].includes(project.status);
    case "in_progress": return project.status === "STEP5";
    case "review": return project.status === "STEP5";
    case "completed": return project.status === "STEP6";
    case "STEP1": return project.status === "draft";
    case "STEP2": return project.status === "open";
    case "STEP3": return project.status === "open";
    case "STEP4": return project.status === "open";
    case "STEP5": return ["in_progress", "review"].includes(project.status);
    case "STEP6": return project.status === "completed";
    default: return false;
  }
}
