import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, CreditCard, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface MissingInfo {
  siret: boolean;
  iban: boolean;
}

export const CompleteProfileCard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missingInfo, setMissingInfo] = useState<MissingInfo>({ siret: false, iban: false });
  const [isVisible, setIsVisible] = useState(false);

  // Check what information is missing
  useEffect(() => {
    const checkMissingInfo = async () => {
      if (user?.role !== 'student' || !user?.id) return;

      try {
        const { data: studentData, error } = await supabase
          .from('students')
          .select('siret, iban')
          .eq('id_user', user.id)
          .single();

        if (!error && studentData) {
          const missing = {
            siret: !studentData.siret || studentData.siret.trim() === '',
            iban: !studentData.iban || studentData.iban.trim() === ''
          };

          setMissingInfo(missing);
          setIsVisible(missing.siret || missing.iban);
        }
      } catch (error) {
        console.error('Error checking missing profile info:', error);
      }
    };

    checkMissingInfo();
  }, [user]);

  if (!isVisible || user?.role !== 'student') {
    return null;
  }

  const missingCount = Object.values(missingInfo).filter(Boolean).length;
  const missingItems = [];
  
  if (missingInfo.siret) {
    missingItems.push({ label: "Numéro SIRET", icon: Building2 });
  }
  if (missingInfo.iban) {
    missingItems.push({ label: "IBAN", icon: CreditCard });
  }

  return (
    <Card className="border-l-4 border-l-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          Complétez votre profil
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {missingCount} élément{missingCount > 1 ? 's' : ''} manquant{missingCount > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <CardDescription>
          Pour recevoir vos paiements et finaliser vos projets, complétez les informations manquantes dans votre profil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Informations manquantes :</p>
          <div className="grid grid-cols-1 gap-2">
            {missingItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end pt-2">
            <Button 
              onClick={() => navigate('/profile')}
              variant="default"
              size="sm"
            >
              Aller au profil
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};