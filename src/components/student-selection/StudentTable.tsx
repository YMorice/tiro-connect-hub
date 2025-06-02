
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  email: string;
  name: string;
  bio?: string;
  skills?: string[];
  specialty?: string;
  available?: boolean;
}

interface StudentTableProps {
  students: Student[];
  selectedStudents: Student[];
  onToggleSelection: (student: Student) => void;
  isStudentSelected: (studentId: string) => boolean;
  loading: boolean;
  emptyMessage: string;
}

export const StudentTable = ({
  students,
  selectedStudents,
  onToggleSelection,
  isStudentSelected,
  loading,
  emptyMessage
}: StudentTableProps) => {
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {selectedStudents.length === 0 
            ? "No students selected" 
            : `${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} selected`}
        </p>
      </div>
      <div className="border rounded-md flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
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
            <TableBody>
              {students.length > 0 ? (
                students.map(student => (
                  <TableRow 
                    key={student.id}
                    className={isStudentSelected(student.id) ? "bg-muted/50" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isStudentSelected(student.id)}
                        onCheckedChange={() => onToggleSelection(student)}
                        aria-label={`Select ${student.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge 
                        variant={student.available !== false ? "default" : "secondary"}
                        className={student.available !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {student.available !== false ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
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
                    <TableCell className="hidden lg:table-cell">
                      {student.specialty || "Not specified"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell max-w-[300px] truncate">
                      {student.bio || "No bio available"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
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
