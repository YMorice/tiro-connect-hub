import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, MapPin, GraduationCap, Star } from 'lucide-react';
import { StudentAvailabilityService } from '@/services/student-availability-service';
interface ProposedStudent {
  id_student: string;
  users: {
    name: string;
    email: string;
    pp_link?: string;
  };
  biography?: string;
  specialty?: string;
  skills?: string[];
  formation?: string;
  portfolio_link?: string;
  available: boolean;
}
interface StudentSelectionViewProps {
  projectId: string;
  onStudentSelected: () => void;
}
const StudentSelectionView: React.FC<StudentSelectionViewProps> = ({
  projectId,
  onStudentSelected
}) => {
  const [proposedStudents, setProposedStudents] = useState<ProposedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  useEffect(() => {
    fetchProposedStudents();
  }, [projectId]);
  const fetchProposedStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching proposed students for project:', projectId);

      // Mock proposed students for demonstration
      const mockProposedStudents: ProposedStudent[] = [{
        id_student: "student-1",
        users: {
          name: "Alice Johnson",
          email: "alice.johnson@student.com",
          pp_link: undefined
        },
        biography: "Passionate web developer with 3 years of experience in React and Node.js. I love creating user-friendly interfaces and solving complex problems.",
        specialty: "Web Development",
        skills: ["React", "Node.js", "TypeScript", "MongoDB", "Express"],
        formation: "Computer Science, University of Technology",
        portfolio_link: "https://alice-portfolio.com",
        available: true
      }, {
        id_student: "student-2",
        users: {
          name: "Bob Smith",
          email: "bob.smith@student.com",
          pp_link: undefined
        },
        biography: "UI/UX designer with a focus on mobile applications. I have experience in creating intuitive and beautiful user experiences.",
        specialty: "UI/UX Design",
        skills: ["Figma", "Adobe XD", "Prototyping", "User Research", "Mobile Design"],
        formation: "Design, Art Institute",
        portfolio_link: "https://bob-design.com",
        available: false
      }, {
        id_student: "student-3",
        users: {
          name: "Charlie Davis",
          email: "charlie.davis@student.com",
          pp_link: undefined
        },
        biography: "Full-stack developer specializing in modern JavaScript frameworks and cloud technologies.",
        specialty: "Full-Stack Development",
        skills: ["Vue.js", "Python", "AWS", "Docker", "PostgreSQL"],
        formation: "Software Engineering, Tech University",
        portfolio_link: "https://charlie-dev.com",
        available: true
      }];
      console.log('Mock proposed students loaded:', mockProposedStudents.length);
      setProposedStudents(mockProposedStudents);
    } catch (error) {
      console.error('Error fetching proposed students:', error);
      toast.error('Failed to load proposed students');
    } finally {
      setLoading(false);
    }
  };
  const selectStudent = async (studentId: string) => {
    try {
      setSelecting(studentId);
      console.log('Selecting student:', studentId, 'for project:', projectId);

      // For entrepreneurs, we don't check availability - they can select any proposed student
      // The availability check is only for admin purposes

      // Simulate selection process
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Student selected successfully!');
      onStudentSelected();
    } catch (error) {
      console.error('Error selecting student:', error);
      toast.error('Failed to select student');
    } finally {
      setSelecting(null);
    }
  };
  if (loading) {
    return <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiro-primary"></div>
      </div>;
  }
  if (proposedStudents.length === 0) {
    return <div className="text-center py-8">
        <p className="text-gray-500">No students have been proposed for this project yet.</p>
        <p className="text-sm text-gray-400 mt-2">The admin will propose students for you to choose from.</p>
      </div>;
  }
  return <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Select a Student</h3>
      <p className="text-sm text-gray-600 mb-4">
        Choose from students proposed by the admin:
      </p>
      
      <div className="grid gap-4">
        {proposedStudents.map(student => <Card key={student.id_student} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Avatar className="w-16 h-16">
                  {student.users.pp_link ? <AvatarImage src={student.users.pp_link} alt={student.users.name} /> : <AvatarFallback className="bg-tiro-primary text-white text-lg">
                      {student.users.name.charAt(0).toUpperCase()}
                    </AvatarFallback>}
                </Avatar>

                {/* Student Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {student.users.name}
                      </h4>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Mail className="h-4 w-4 mr-1" />
                        {student.users.email}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      
                    </div>
                  </div>

                  {/* Specialty & Formation */}
                  {(student.specialty || student.formation) && <div className="flex flex-wrap gap-2 mb-3">
                      {student.specialty && <div className="flex items-center text-sm text-gray-600">
                          <GraduationCap className="h-4 w-4 mr-1" />
                          {student.specialty}
                        </div>}
                      {student.formation && <div className="text-sm text-gray-600">
                          • {student.formation}
                        </div>}
                    </div>}

                  {/* Biography */}
                  {student.biography && <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {student.biography}
                    </p>}

                  {/* Skills */}
                  {student.skills && student.skills.length > 0 && <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {student.skills.slice(0, 5).map((skill, index) => <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>)}
                        {student.skills.length > 5 && <Badge variant="outline" className="text-xs">
                            +{student.skills.length - 5} more
                          </Badge>}
                      </div>
                    </div>}

                  {/* Portfolio Link */}
                  {student.portfolio_link && <div className="mb-4">
                      <a href={student.portfolio_link} target="_blank" rel="noopener noreferrer" className="text-sm text-tiro-primary hover:underline">
                        View Portfolio →
                      </a>
                    </div>}

                  {/* Select Button - No availability check for entrepreneurs */}
                  <Button onClick={() => selectStudent(student.id_student)} disabled={selecting === student.id_student} className="w-full bg-tiro-primary hover:bg-tiro-primary/90">
                    {selecting === student.id_student ? <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Selecting...
                      </> : 'Select This Student'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>
    </div>;
};
export default StudentSelectionView;