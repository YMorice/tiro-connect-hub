
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StudentProposalActionsProps {
  projectId: string;
  studentId: string;
  proposalStatus: 'pending' | 'accepted' | 'declined';
  onStatusChange: () => void;
}

const StudentProposalActions: React.FC<StudentProposalActionsProps> = ({
  projectId,
  studentId,
  proposalStatus,
  onStatusChange
}) => {
  const [loading, setLoading] = useState(false);

  const handleProposalResponse = async (accepted: boolean) => {
    try {
      setLoading(true);
      console.log('Mise à jour du statut de la proposition:', { projectId, studentId, accepted });

      const { error } = await supabase
        .from('proposal_to_student')
        .update({ accepted })
        .eq('id_project', projectId)
        .eq('id_student', studentId);

      if (error) {
        console.error('Erreur lors de la mise à jour du statut de la proposition:', error);
        throw error;
      }

      toast.success(accepted ? 'Intérêt exprimé avec succès !' : 'Proposition refusée');
      onStatusChange();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la proposition:', error);
      toast.error('Échec de la mise à jour du statut de la proposition');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    switch (proposalStatus) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-yellow-100 text-yellow-800',
          message: 'Ce projet vous a été proposé. Souhaitez-vous exprimer votre intérêt ?'
        };
      case 'accepted':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800',
          message: 'Vous avez exprimé votre intérêt pour ce projet. L\'entrepreneur examinera les différents profils et pourra vous sélectionner.'
        };
      case 'declined':
        return {
          icon: XCircle,
          color: 'bg-red-100 text-red-800',
          message: 'Vous avez refusé cette proposition de projet.'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="border-l-4 border-l-blue-500 items-left bg-tiro-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Proposition de projet
            <Badge className={statusInfo.color}>
              {proposalStatus === 'pending' ? 'En attente' : 
               proposalStatus === 'accepted' ? 'Accepté' : 'Refusé'}
            </Badge>
          </CardTitle>
          
          {proposalStatus === 'pending' && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 min-w-0 sm:flex-shrink-0">
              <Button
                onClick={() => handleProposalResponse(true)}
                disabled={loading}
                size="sm"
                className="bg-tiro-secondary hover:bg-tiro-secondary/70 w-full sm:w-60"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Traitement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Exprimer de l'intérêt
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleProposalResponse(false)}
                disabled={loading}
                variant="outline"
                size="sm"
                className="bg-tiro-primary text-tiro-white hover:bg-tiro-primary/70 hover:text-tiro-white w-full sm:w-60"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    Traitement...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Refuser
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-fit flex justify-start items-left gap-3 p-3 pr-10 bg-blue-50 rounded-lg">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1 text-left">Comment ça fonctionne :</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-left">
              <li>Exprimer votre intérêt indique que vous êtes disponible pour ce projet</li>
              <li>L'entrepreneur recevra une sélection de 3 profils intéressés par son besoin</li>
              <li>Si vous êtes sélectionné, vous serez assigné et ajouté à la conversation du projet</li>
            </ul>
          </div>
        </div>

        <p className="text-gray-700">{statusInfo.message}</p>
      </CardContent>
    </Card>
  );
};

export default StudentProposalActions;
