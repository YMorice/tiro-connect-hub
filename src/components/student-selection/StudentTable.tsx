
/**
 * Student Table Component
 * 
 * This component displays a comprehensive table of students with selection functionality.
 * It's designed for use in student selection workflows where users need to choose
 * students for project assignments.
 * 
 * Key Features:
 * - Responsive table design that adapts to different screen sizes
 * - Checkbox selection with visual feedback
 * - Comprehensive student information display
 * - Loading and empty states
 * - Availability status indicators
 * - Skills display with tags
 * - Scrollable content area for large datasets
 * 
 * Column Visibility:
 * - Always visible: Select checkbox, Name
 * - sm and up: Available status
 * - md and up: Skills
 * - lg and up: Specialty
 * - xl and up: Biography
 * 
 * The component uses Tailwind's responsive utilities to progressively show
 * more information as screen size increases, ensuring usability on all devices.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

/**
 * Interface for student data structure
 * Contains all the information needed to display and select students
 */
interface Student {
  /** Unique identifier for the student */
  id: string;
  /** Student's email address */
  email: string;
  /** Student's full name */
  name: string;
  /** Optional biography/description */
  bio?: string;
  /** Array of student's skills */
  skills?: string[];
  /** Student's area of specialty */
  specialty?: string;
  /** Whether the student is currently available for new projects */
  available?: boolean;
}

/**
 * Props interface for the StudentTable component
 */
interface StudentTableProps {
  /** Array of all students to display in the table */
  students: Student[];
  /** Array of currently selected students */
  selectedStudents: Student[];
  /** Callback function when a student's selection state changes */
  onToggleSelection: (student: Student) => void;
  /** Function to check if a specific student is currently selected */
  isStudentSelected: (studentId: string) => boolean;
  /** Whether the table is in a loading state */
  loading: boolean;
  /** Message to display when no students are available */
  emptyMessage: string;
}

/**
 * StudentTable Component
 * 
 * Renders a comprehensive table of students with selection capabilities
 * and responsive design for optimal viewing on all devices.
 * 
 * @param students - Array of students to display
 * @param selectedStudents - Currently selected students
 * @param onToggleSelection - Callback for selection changes
 * @param isStudentSelected - Function to check selection status
 * @param loading - Loading state indicator
 * @param emptyMessage - Message for empty state
 */
export const StudentTable = ({
  students,
  selectedStudents,
  onToggleSelection,
  isStudentSelected,
  loading,
  emptyMessage
}: StudentTableProps) => {
  
  // Show loading spinner while data is being fetched
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Selection Summary */}
      <div className="mb-4 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {selectedStudents.length === 0 
            ? "No students selected" 
            : `${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} selected`}
        </p>
      </div>
      
      {/* Table Container with Scrolling */}
      <div className="border rounded-md flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            {/* Table Header with Responsive Column Visibility */}
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Available</TableHead>
                <TableHead className="hidden md:table-cell">Skills</TableHead>
                <TableHead className="hidden lg:table-cell">Specialty</TableHead>
                <TableHead className="hidden xl:table-cell">Bio</TableHead>
              </TableRow>
            </TableHeader>
            
            {/* Table Body */}
            <TableBody>
              {students.length > 0 ? (
                students.map(student => (
                  <TableRow 
                    key={student.id}
                    className={isStudentSelected(student.id) ? "bg-muted/50" : ""}
                  >
                    {/* Selection Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={isStudentSelected(student.id)}
                        onCheckedChange={() => onToggleSelection(student)}
                        aria-label={`Select ${student.name}`}
                      />
                    </TableCell>
                    
                    {/* Student Name - Always Visible */}
                    <TableCell className="font-medium">{student.name}</TableCell>
                    
                    {/* Availability Status - Visible on sm+ screens */}
                    <TableCell className="hidden sm:table-cell">
                      <Badge 
                        variant={student.available !== false ? "default" : "secondary"}
                        className={student.available !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {student.available !== false ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                    
                    {/* Skills - Visible on md+ screens */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {student.skills?.map((skill, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted"
                          >
                            {skill}
                          </span>
                        )) || "No skills listed"}
                      </div>
                    </TableCell>
                    
                    {/* Specialty - Visible on lg+ screens */}
                    <TableCell className="hidden lg:table-cell">
                      {student.specialty || "Not specified"}
                    </TableCell>
                    
                    {/* Biography - Visible on xl+ screens */}
                    <TableCell className="hidden xl:table-cell max-w-[300px] truncate">
                      {student.bio || "No bio available"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                /* Empty State */
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
};
