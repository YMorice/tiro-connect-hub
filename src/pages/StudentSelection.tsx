
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Search, Check, FilterX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Student {
  id: string;
  email: string;
  name: string;
  bio?: string;
  skills?: string[];
  specialty?: string;
}

const StudentSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const projectTitle = searchParams.get('projectTitle');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]); 
  
  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard");
      toast.error("You don't have permission to access this page");
    }
    
    if (!projectId) {
      navigate("/admin");
      toast.error("No project selected");
    }
  }, [user, navigate, projectId]);

  // Fetch students from database
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        const { data: studentsData, error } = await supabase
          .from('students')
          .select(`
            id_student,
            biography,
            skills,
            specialty,
            formation,
            users (
              id_users,
              email,
              name,
              surname,
              role,
              created_at
            )
          `);
          
        if (error) {
          throw error;
        }
        
        // Transform the data to match the Student type
        const formattedStudents: Student[] = studentsData.map(student => ({
          id: student.id_student,
          email: student.users.email,
          name: `${student.users.name} ${student.users.surname}`,
          bio: student.biography || undefined,
          skills: student.skills || undefined,
          specialty: student.specialty || undefined,
        }));
        
        setStudents(formattedStudents);
        
        // Extract unique specialties for filter dropdown
        const uniqueSpecialties = Array.from(
          new Set(studentsData.map(student => student.specialty).filter(Boolean))
        ) as string[];
        
        setSpecialties(uniqueSpecialties);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error("Failed to load student profiles");
      } finally {
        setLoading(false);
      }
    };
    
    if (user && user.role === "admin" && projectId) {
      fetchStudents();
    }
  }, [user, projectId]);

  // Filter students based on search query, skill filter, and specialty filter
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchQuery.trim() === "" || 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.bio && student.bio.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSkill = skillFilter.trim() === "" || 
      (student.skills && student.skills.some(skill => 
        skill.toLowerCase().includes(skillFilter.toLowerCase())));
    
    const matchesSpecialty = specialtyFilter === "" || 
      (student.specialty && student.specialty.toLowerCase() === specialtyFilter.toLowerCase());
    
    return matchesSearch && matchesSkill && matchesSpecialty;
  });

  // Toggle student selection
  const toggleStudentSelection = (student: Student) => {
    setSelectedStudents(prevSelected => {
      const isSelected = prevSelected.some(s => s.id === student.id);
      if (isSelected) {
        return prevSelected.filter(s => s.id !== student.id);
      } else {
        return [...prevSelected, student];
      }
    });
  };

  // Check if student is selected
  const isStudentSelected = (studentId: string) => {
    return selectedStudents.some(s => s.id === studentId);
  };

  // Propose selected students for the project
  const proposeStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student to propose");
      return;
    }

    try {
      // Add entries to proposal_to_student table
      const proposalEntries = selectedStudents.map(student => ({
        id_project: projectId,
        id_student: student.id,
        accepted: false // Initially false, students will accept later
      }));
      
      const { error: proposalError } = await supabase
        .from('proposal_to_student')
        .insert(proposalEntries);
        
      if (proposalError) {
        throw proposalError;
      }
      
      // Also add to proposed_student table for backward compatibility
      const proposedEntries = selectedStudents.map(student => ({
        student_id: student.id,
        project_id: projectId
      }));
      
      const { error: proposedError } = await supabase
        .from('proposed_student')
        .insert(proposedEntries);
        
      if (proposedError) {
        throw proposedError;
      }
      
      toast.success(`Proposed ${selectedStudents.length} students for the project`);
      navigate('/admin');
      
    } catch (error) {
      console.error('Error proposing students:', error);
      toast.error("Failed to propose students");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSkillFilter("");
    setSpecialtyFilter("");
  };

  // Navigate back to admin page
  const goBack = () => {
    navigate('/admin');
  };

  if (!user || user.role !== "admin") {
    return null; // Will redirect in the useEffect
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button 
              onClick={goBack}
              className="flex items-center text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Admin
            </button>
            <h1 className="text-3xl font-bold">Student Selection</h1>
            <p className="text-muted-foreground">
              {projectTitle ? `For project: ${projectTitle}` : 'Select students for project'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearFilters}
              disabled={!searchQuery && !skillFilter && !specialtyFilter}
              className="flex items-center"
            >
              <FilterX className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
            <Button 
              onClick={proposeStudents}
              disabled={selectedStudents.length === 0}
              className="flex items-center"
            >
              <Check className="h-4 w-4 mr-1" />
              Propose {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="search" className="text-sm font-medium">Search by name or bio</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="skill" className="text-sm font-medium">Filter by skill</label>
                <Input
                  id="skill"
                  type="text"
                  placeholder="Enter a skill..."
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="specialty" className="text-sm font-medium">Filter by specialty</label>
                <Select
                  value={specialtyFilter}
                  onValueChange={setSpecialtyFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All specialties</SelectItem>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty.toLowerCase()}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students ({filteredStudents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    {selectedStudents.length === 0 
                      ? "No students selected" 
                      : `${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} selected`}
                  </p>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Skills</TableHead>
                        <TableHead className="hidden md:table-cell">Specialty</TableHead>
                        <TableHead className="hidden lg:table-cell">Bio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map(student => (
                          <TableRow 
                            key={student.id}
                            className={isStudentSelected(student.id) ? "bg-muted/50" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isStudentSelected(student.id)}
                                onCheckedChange={() => toggleStudentSelection(student)}
                                aria-label={`Select ${student.name}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="hidden sm:table-cell">
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
                            <TableCell className="hidden md:table-cell">
                              {student.specialty || "Not specified"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell max-w-[300px] truncate">
                              {student.bio || "No bio available"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            {students.length > 0
                              ? "No students match the current filters"
                              : "No student profiles found"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default StudentSelection;
