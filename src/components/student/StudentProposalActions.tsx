
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
      console.log('Updating proposal status:', { projectId, studentId, accepted });

      const { error } = await supabase
        .from('proposal_to_student')
        .update({ accepted })
        .eq('id_project', projectId)
        .eq('id_student', studentId);

      if (error) {
        console.error('Error updating proposal status:', error);
        throw error;
      }

      toast.success(accepted ? 'Interest shown successfully!' : 'Proposal declined');
      onStatusChange();
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error('Failed to update proposal status');
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
          message: 'This project has been proposed to you. Would you like to show interest?'
        };
      case 'accepted':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800',
          message: 'You have shown interest in this project. The entrepreneur will review and may select you.'
        };
      case 'declined':
        return {
          icon: XCircle,
          color: 'bg-red-100 text-red-800',
          message: 'You have declined this project proposal.'
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
          Project Proposal
          <Badge className={statusInfo.color}>
            {proposalStatus.charAt(0).toUpperCase() + proposalStatus.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Showing interest indicates you're available for this project</li>
              <li>The entrepreneur will review interested students</li>
              <li>If selected, you'll be assigned and added to the project conversation</li>
              <li>Only one student will be selected per project</li>
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
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Show Interest
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
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </>
              )}
            </Button>
          </div>
        )}

        {proposalStatus === 'accepted' && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Next steps:</strong> Wait for the entrepreneur to review all interested students and make their selection. You'll be notified if you're chosen for the project.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentProposalActions;
