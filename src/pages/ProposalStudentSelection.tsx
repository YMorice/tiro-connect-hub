import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

// Helper function to convert display status to database status
const convertDisplayStatusToDb = (displayStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    'New': 'STEP1',
    'Proposals': 'STEP2',
    'Selection': 'STEP3', 
    'Payment': 'STEP4',
    'Active': 'STEP5',
    'In progress': 'STEP6'
  };
  return statusMap[displayStatus] || displayStatus;
};

const ProposalStudentSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const projectTitle = searchParams.get('projectTitle');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]); 
  
  // Redirect if not admin
  useEffect(() => {
    if (user && (user as any).role !== "admin") {
      navigate("/dashboard");
      toast.error("You don't have permission to access this page");
    }
    
    if (!projectId) {
      navigate("/admin");
      toast.error("No project selected");
    }
  }, [user, navigate, projectId]);

  // Fetch students who accepted the proposal for this project
  useEffect(() => {
    const fetchAcceptedStudents = async () => {
      try {
        setLoading(true);
        console.log('Fetching students who accepted proposals for project:', projectId);
        
        // Get students who accepted the proposal for this specific project
        const { data: proposalData, error } = await supabase
          .from('proposal_to_student')
          .select(`
            id_student,
            students (
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
            )
          `)
          .eq('id_project', projectId)
          .eq('accepted', true);
          
        if (error) {
          console.error('Error fetching accepted students:', error);
          throw error;
        }
        
        console.log('Found accepted students:', proposalData);
        
        if (!proposalData || proposalData.length === 0) {
          console.log('No students have accepted the proposal yet');
          setStudents([]);
          setSpecialties([]);
          return;
        }
        
        // Transform the data to match the Student type
        const formattedStudents: Student[] = proposalData
          .filter(proposal => proposal.students && proposal.students.users) // Filter out invalid entries
          .map(proposal => ({
            id: proposal.students.id_student,
            email: proposal.students.users.email,
            name: `${proposal.students.users.name} ${proposal.students.users.surname}`,
            bio: proposal.students.biography || undefined,
            skills: proposal.students.skills || undefined,
            specialty: proposal.students.specialty || undefined,
          }));
        
        console.log('Formatted students:', formattedStudents);
        setStudents(formattedStudents);
        
        // Extract unique specialties for filter dropdown
        const uniqueSpecialties = Array.from(
          new Set(formattedStudents.map(student => student.specialty).filter(Boolean))
        ) as string[];
        
        setSpecialties(uniqueSpecialties);
      } catch (error) {
        console.error('Error fetching accepted students:', error);
        toast.error("Failed to load students who accepted the proposal");
      } finally {
        setLoading(false);
      }
    };
    
    if (user && (user as any).role === "admin" && projectId) {
      fetchAcceptedStudents();
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

  // Propose selected students to entrepreneur
  const proposeStudentsToEntrepreneur = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student to propose to the entrepreneur");
      return;
    }

    try {
      setProposing(true);
      console.log('Proposing accepted students to entrepreneur:', selectedStudents.map(s => s.id), 'for project:', projectId);
      
      // Insert entries into proposed_student table
      const proposedEntries = selectedStudents.map(student => ({
        project_id: projectId,
        student_id: student.id
      }));
      
      console.log('Inserting proposed student entries:', proposedEntries);
      
      const { error: proposedError } = await supabase
        .from('proposed_student')
        .insert(proposedEntries);
        
      if (proposedError) {
        console.error('Error inserting proposed students:', proposedError);
        throw proposedError;
      }
      
      // Update project status to "Selection" (STEP3)
      const { error: statusError } = await supabase
        .from('projects')
        .update({ status: 'STEP3' })
        .eq('id_project', projectId);
        
      if (statusError) {
        console.error('Error updating project status:', statusError);
        throw statusError;
      }
      
      console.log('Successfully proposed students to entrepreneur and updated project status');
      toast.success(`Successfully proposed ${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} to the entrepreneur. Project status updated to "Selection".`);
      navigate('/admin');
      
    } catch (error) {
      console.error('Error proposing students to entrepreneur:', error);
      toast.error("Failed to propose students to entrepreneur");
    } finally {
      setProposing(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSkillFilter("");
    setSpecialtyFilter("");
  };

  if (!user || (user as any).role !== "admin") {
    return null; // Will redirect in the useEffect
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button 
              onClick={() => navigate('/admin')}
              className="flex items-center text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Admin
            </button>
            <h1 className="text-3xl font-bold">Proposal Student Selection</h1>
            <p className="text-muted-foreground">
              {projectTitle ? `For project: ${projectTitle}` : 'Select students who accepted to propose to entrepreneur'}
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
              onClick={proposeStudentsToEntrepreneur}
              disabled={selectedStudents.length === 0 || proposing}
              className="flex items-center"
            >
              <Check className="h-4 w-4 mr-1" />
              {proposing ? 'Proposing...' : `Propose ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''} to Entrepreneur`}
            </Button>
          </div>
        </div>

        {selectedStudents.length === 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 font-medium">⚠️ Please select at least one student before proposing to entrepreneur</p>
            <p className="text-orange-600 text-sm mt-1">You must choose from students who accepted the proposal to send to the entrepreneur.</p>
          </div>
        )}

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
            <CardTitle>Students Who Accepted ({filteredStudents.length})</CardTitle>
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
                              : "No students have accepted the proposal yet"}
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

export default ProposalStudentSelection;
