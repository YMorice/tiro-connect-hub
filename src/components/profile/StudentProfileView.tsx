
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import StudentReviewsSection from '@/components/reviews/StudentReviewsSection';
import { useAuth } from '@/context/auth-context';

interface StudentProfileViewProps {
  studentId: string;
  studentProfile: {
    name: string;
    surname: string;
    email: string;
    avatar?: string;
    bio?: string;
    specialty?: string;
    skills?: string[];
    formation?: string;
    portfolioLink?: string;
  };
}

const StudentProfileView: React.FC<StudentProfileViewProps> = ({ 
  studentId, 
  studentProfile 
}) => {
  const { user } = useAuth();
  const { name, surname, email, avatar, bio, specialty, skills, formation, portfolioLink } = studentProfile;
  
  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  // Only show reviews section for students and admins viewing student profiles
  const showReviewsSection = (user as any)?.role === 'student' || (user as any)?.role === 'admin';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <Avatar className="h-24 w-24">
              {avatar ? (
                <AvatarImage src={avatar} alt={`${name} ${surname}`} />
              ) : (
                <AvatarFallback className="text-lg">
                  {getInitials(name, surname)}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="space-y-4 text-center md:text-left flex-1">
              <div>
                <h2 className="text-xl font-bold">{name} {surname}</h2>
                <p className="text-muted-foreground">{email}</p>
                {specialty && <p className="text-sm font-medium mt-1">{specialty}</p>}
              </div>
              
              {bio && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">About</h3>
                  <p className="text-sm text-muted-foreground">{bio}</p>
                </div>
              )}
              
              {formation && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Education</h3>
                  <p className="text-sm">{formation}</p>
                </div>
              )}
              
              {skills && skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Skills</h3>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {portfolioLink && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Portfolio</h3>
                  <a 
                    href={portfolioLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-tiro-primary hover:underline"
                  >
                    View Portfolio
                  </a>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showReviewsSection && <StudentReviewsSection studentId={studentId} />}
    </div>
  );
};

export default StudentProfileView;
