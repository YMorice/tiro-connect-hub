import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Check } from "lucide-react";
import { StudentSelectionFilters } from "@/components/student-selection/StudentSelectionFilters";
import { StudentTable } from "@/components/student-selection/StudentTable";
import { useStudentSelection } from "@/hooks/useStudentSelection";
import { useState } from "react";

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

const StudentSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const projectTitle = searchParams.get('projectTitle');
  const mode = searchParams.get('mode') as 'new' | 'proposals' || 'new';
  
  const [proposing, setProposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  
  console.log('StudentSelection page params:', { projectId, projectTitle, mode });
  
  const {
    students,
    selectedStudents,
    loading,
    specialties,
    toggleStudentSelection,
    isStudentSelected
  } = useStudentSelection({ projectId, mode });
  
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

  // Propose selected students for the project
  const proposeStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student to propose");
      return;
    }

    if (!projectId) {
      toast.error("No project ID found");
      return;
    }

    try {
      setProposing(true);
      console.log('Proposing students:', selectedStudents.map(s => ({ id: s.id, name: s.name })), 'for project:', projectId, 'mode:', mode);
      
      if (mode === 'new') {
        // Insert proposals into proposal_to_student table with accepted=null (pending)
        const proposalEntries = selectedStudents.map(student => ({
          id_project: projectId,
          id_student: student.id,
          accepted: null // null means pending, true means accepted, false means declined
        }));
        
        console.log('Inserting proposal entries:', proposalEntries);
        
        const { error: proposalError } = await supabase
          .from('proposal_to_student')
          .insert(proposalEntries);
          
        if (proposalError) {
          console.error('Error inserting proposals:', proposalError);
          throw proposalError;
        }
        
        // Send notifications to students via Novu
        console.log('Sending notifications to students via Novu');
        try {
          const { error: notifyError } = await supabase.functions.invoke('notify-students', {
            body: {
              projectId: projectId,
              studentIds: selectedStudents.map(s => s.id)
            }
          });
          
          if (notifyError) {
            console.error('Error sending notifications:', notifyError);
            // Don't throw here - we don't want notification errors to break the flow
            toast.error('Propositions créées mais erreur lors de l\'envoi des notifications');
          } else {
            console.log('Notifications sent successfully');
          }
        } catch (notifyError) {
          console.error('Notification error:', notifyError);
          // Continue with the flow even if notifications fail
        }
        
        // Update project status to "Proposals" (STEP2)
        console.log('Updating project status to STEP2');
        const { error: statusError } = await supabase
          .from('projects')
          .update({ status: 'STEP2' })
          .eq('id_project', projectId);
          
        if (statusError) {
          console.error('Error updating project status:', statusError);
          throw statusError;
        }
        
        console.log('Successfully proposed students and updated project status');
        toast.success(`Successfully proposed ${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} for the project. Project status updated to "Proposals".`);
        
        navigate('/admin');
      } else {
        // For proposals mode, insert entries into proposed_student table
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
        
        // Set selected students as unavailable
        const { error: availabilityError } = await supabase
          .from('students')
          .update({ available: false })
          .in('id_student', selectedStudents.map(s => s.id));
          
        if (availabilityError) {
          console.error('Error updating student availability:', availabilityError);
          throw availabilityError;
        }
        
        // Update project status to "Selection" (STEP3)
        console.log('Updating project status to STEP3');
        const { error: statusError } = await supabase
          .from('projects')
          .update({ status: convertDisplayStatusToDb('Selection') })
          .eq('id_project', projectId);
          
        if (statusError) {
          console.error('Error updating project status:', statusError);
          throw statusError;
        }
        
        console.log('Successfully proposed students to entrepreneur and updated project status');
        toast.success(`Successfully proposed ${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} to the entrepreneur. Project status updated to "Selection".`);
        
        navigate('/admin');
      }
      
    } catch (error) {
      console.error('Error proposing students:', error);
      toast.error("Failed to propose students");
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

  const pageTitle = mode === 'new' ? 'Student Selection' : 'Proposal Student Selection';
  const pageDescription = mode === 'new' 
    ? 'Select students for project' 
    : 'Select students who accepted to propose to entrepreneur';
  const buttonText = mode === 'new' 
    ? `Propose ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}` 
    : `Propose ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''} to Entrepreneur`;
  const warningText = mode === 'new' 
    ? 'You must choose students to send proposals to for this project.' 
    : 'You must choose from students who accepted the proposal to send to the entrepreneur.';
  const emptyMessage = mode === 'new' 
    ? (students.length > 0 ? "No students match the current filters" : "No student profiles found")
    : (students.length > 0 ? "No students match the current filters" : "No students have accepted the proposal yet");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0 space-y-4 p-4">
        <div className="flex flex-col gap-3">
          <div>
            <button 
              onClick={() => navigate('/admin')}
              className="flex items-center text-muted-foreground hover:text-foreground mb-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Admin
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{pageTitle}</h1>
            <p className="text-muted-foreground text-sm">
              {projectTitle ? `For project: ${projectTitle}` : pageDescription}
            </p>
            <p className="text-xs text-muted-foreground">
              Mode: {mode} | Project ID: {projectId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={proposeStudents}
              disabled={selectedStudents.length === 0 || proposing}
              className="flex items-center text-sm h-9"
              size="sm"
            >
              <Check className="h-4 w-4 mr-1" />
              {proposing ? 'Proposing...' : buttonText}
            </Button>
          </div>
        </div>

        {selectedStudents.length === 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 font-medium text-sm">⚠️ Please select at least one student before proposing</p>
            <p className="text-orange-600 text-xs mt-1">{warningText}</p>
          </div>
        )}

        <StudentSelectionFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          skillFilter={skillFilter}
          setSkillFilter={setSkillFilter}
          specialtyFilter={specialtyFilter}
          setSpecialtyFilter={setSpecialtyFilter}
          specialties={specialties}
          onClearFilters={clearFilters}
        />
      </div>

      <div className="flex-1 overflow-hidden px-4 pb-4">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0 p-4">
            <CardTitle className="text-lg">
              {mode === 'new' ? `Students (${filteredStudents.length})` : `Students Who Accepted (${filteredStudents.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-4 pt-0">
            <div className="h-full">
              <StudentTable
                students={filteredStudents}
                selectedStudents={selectedStudents}
                onToggleSelection={toggleStudentSelection}
                isStudentSelected={isStudentSelected}
                loading={loading}
                emptyMessage={emptyMessage}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentSelection;
