
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CreditCard, Users, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PaymentStatusMessageProps {
  projectStatus: string;
}

const PaymentStatusMessage = ({ projectStatus }: PaymentStatusMessageProps) => {
  if (projectStatus !== 'STEP4') return null;

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center text-orange-800">
          <CreditCard className="h-5 w-5 mr-2" />
          Payment Confirmation Pending
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-3">
          <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-orange-800 font-medium">
              Waiting for Admin Payment Confirmation
            </p>
            <p className="text-sm text-orange-700 mt-1">
              Our admin team is currently reviewing and confirming your payment for this project.
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-orange-800 font-medium">
              What happens next?
            </p>
            <p className="text-sm text-orange-700 mt-1">
              Once payment is confirmed, your project will be activated and the selected student will be added to the project conversation.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Users className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-orange-800 font-medium">
              Project Activation
            </p>
            <p className="text-sm text-orange-700 mt-1">
              Your project status will change to "Active" and you'll be able to communicate directly with your selected student.
            </p>
          </div>
        </div>
        
        <div className="bg-orange-100 p-3 rounded-lg">
          <p className="text-xs text-orange-800">
            <strong>Estimated processing time:</strong> 1-2 business days. You'll receive an email notification once your payment is confirmed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentStatusMessage;
