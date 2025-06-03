
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface StudentProposalActionsProps {
  projectId: string;
  studentId: string;
  proposalStatus: 'pending' | 'accepted' | 'declined' | null;
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
    setLoading(true);
    try {
      const { error } = await supabase
        .from('proposal_to_student')
        .update({ accepted })
        .eq('id_project', projectId)
        .eq('id_student', studentId);

      if (error) {
        console.error('Error updating proposal:', error);
        throw error;
      }

      // If accepted, also update the project to select this student
      if (accepted) {
        const { error: projectError } = await supabase
          .from('projects')
          .update({ selected_student: studentId })
          .eq('id_project', projectId);

        if (projectError) {
          console.error('Error updating project:', projectError);
          throw projectError;
        }
      }

      toast.success(accepted ? "Proposal accepted!" : "Proposal declined");
      onStatusChange();
    } catch (error) {
      console.error('Error handling proposal response:', error);
      toast.error("Failed to update proposal status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (proposalStatus) {
      case 'pending':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Response
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Declined
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!proposalStatus || proposalStatus !== 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Proposal Status
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        {proposalStatus === 'accepted' && (
          <CardContent>
            <p className="text-green-700">
              You have accepted this project proposal. You can now start working on it!
            </p>
          </CardContent>
        )}
        {proposalStatus === 'declined' && (
          <CardContent>
            <p className="text-red-700">
              You have declined this project proposal.
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          Project Proposal
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700">
          You have been invited to work on this project. Would you like to accept or decline this proposal?
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleProposalResponse(true)}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept Proposal
          </Button>
          
          <Button
            onClick={() => handleProposalResponse(false)}
            disabled={loading}
            variant="destructive"
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Decline Proposal
          </Button>
        </div>
        
        {loading && (
          <p className="text-sm text-gray-500 text-center">
            Updating proposal status...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentProposalActions;
