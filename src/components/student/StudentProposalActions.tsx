
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
          message: 'Vous avez exprimé votre intérêt pour ce projet. L\'entrepreneur examinera et pourra vous sélectionner.'
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
    <Card className="border-l-4 border-l-tiro-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <StatusIcon className="h-5 w-5" />
          Proposition de projet
          <Badge className={statusInfo.color}>
            {proposalStatus === 'pending' ? 'En attente' : 
             proposalStatus === 'accepted' ? 'Accepté' : 'Refusé'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Comment ça fonctionne :</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Exprimer votre intérêt indique que vous êtes disponible pour ce projet</li>
              <li>L'entrepreneur examinera les étudiants intéressés</li>
              <li>Si sélectionné, vous serez assigné et ajouté à la conversation du projet</li>
              <li>Un seul étudiant sera sélectionné par projet</li>
            </ul>
          </div>
        </div>

        <p className="text-gray-700">{statusInfo.message}</p>

        {proposalStatus === 'pending' && (
          <div className="flex gap-3">
            <Button
              onClick={() => handleProposalResponse(true)}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Exprimer l'intérêt
                </>
              )}
            </Button>
            <Button
              onClick={() => handleProposalResponse(false)}
              disabled={loading}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
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

        {proposalStatus === 'accepted' && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Prochaines étapes :</strong> Attendez que l'entrepreneur examine tous les étudiants intéressés et fasse sa sélection. Vous serez notifié si vous êtes choisi pour le projet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentProposalActions;
