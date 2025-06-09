
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
          Confirmation de Paiement en Attente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-3">
          <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-orange-800 font-medium">
              En attente de la confirmation de paiement par l'administrateur
            </p>
            <p className="text-sm text-orange-700 mt-1">
              Notre équipe d'administration examine et confirme actuellement votre paiement pour ce projet.
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-orange-800 font-medium">
              Que se passe-t-il ensuite ?
            </p>
            <p className="text-sm text-orange-700 mt-1">
              Une fois le paiement confirmé, votre projet sera activé et l'étudiant sélectionné sera ajouté à la conversation du projet.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Users className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-orange-800 font-medium">
              Activation du Projet
            </p>
            <p className="text-sm text-orange-700 mt-1">
              Le statut de votre projet passera à "Actif" et vous pourrez communiquer directement avec l'étudiant sélectionné.
            </p>
          </div>
        </div>
        
        <div className="bg-orange-100 p-3 rounded-lg">
          <p className="text-xs text-orange-800">
            <strong>Temps de traitement estimé :</strong> 1-2 jours ouvrables. Vous recevrez une notification par email une fois votre paiement confirmé.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentStatusMessage;
