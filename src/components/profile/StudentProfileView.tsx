
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
    siret?: string;
    iban?: string;
    address?: string;
  };
}

const StudentProfileView: React.FC<StudentProfileViewProps> = ({ 
  studentId, 
  studentProfile 
}) => {
  const { user } = useAuth();
  const { name, surname, email, avatar, bio, specialty, skills, formation, portfolioLink, siret, iban, address } = studentProfile;
  
  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  // Afficher la section avis seulement pour les étudiants et admins visualisant les profils d'étudiants
  const showReviewsSection = (user as any)?.role === 'student' || (user as any)?.role === 'admin';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations du Profil</CardTitle>
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
                  <h3 className="text-sm font-semibold mb-1">À propos</h3>
                  <p className="text-sm text-muted-foreground">{bio}</p>
                </div>
              )}
              
              {formation && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Formation</h3>
                  <p className="text-sm">{formation}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-semibold mb-1">Compétences</h3>
                {skills && skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune compétence renseignée</p>
                )}
              </div>
              
              {portfolioLink && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Portfolio</h3>
                  <a 
                    href={portfolioLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-tiro-primary hover:underline"
                  >
                    Voir le Portfolio
                  </a>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-semibold mb-1">Adresse</h3>
                <p className="text-sm">{address || "Non renseignée"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-1">SIRET</h3>
                <p className="text-sm">{siret || "Non renseigné"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-1">IBAN</h3>
                <p className="text-sm font-mono">{iban || "Non renseigné"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showReviewsSection && <StudentReviewsSection studentId={studentId} />}
    </div>
  );
};

export default StudentProfileView;
