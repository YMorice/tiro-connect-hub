import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeEuro } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface TipSectionProps {
  projectId: string;
  studentName?: string;
}

const TipSection: React.FC<TipSectionProps> = ({ projectId, studentName }) => {
  const [tipAmount, setTipAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSendTip = async () => {
    const amount = parseFloat(tipAmount);
    
    if (!amount || amount <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    if (amount < 1) {
      toast.error("Le montant minimum est de 1€");
      return;
    }

    if (amount > 10000) {
      toast.error("Le montant maximum est de 10 000€");
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-tip-payment', {
        body: {
          projectId,
          amount,
          studentName
        }
      });

      if (error) {
        console.error('Error creating tip payment:', error);
        toast.error("Erreur lors de la création du paiement: " + error.message);
        return;
      }

      if (data?.url) {
        // Redirect to Stripe checkout in the same tab like normal project payment
        window.location.href = data.url;
      } else {
        toast.error("Erreur: URL de paiement non reçue");
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("Erreur inattendue lors de la création du paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 sm:mb-6">
      <Card className="border-l-4 border-l-yellow-500 bg-tiro-white">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-tiro-black">
            <BadgeEuro className="h-5 w-5 text-yellow-500" />
            Laisser un Pourboire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-tiro-black font-medium mb-2">
                Vous êtes satisfait du travail ? Récompensez {studentName || "l'étudiant"} !
              </p>
              <p className="text-xs text-tiro-black/70">
                Un pourboire est un excellent moyen de montrer votre satisfaction et d'encourager l'étudiant dans son parcours professionnel.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1">
                <label htmlFor="tip-amount" className="block text-sm font-medium text-tiro-black mb-1">
                  Montant du pourboire (€)
                </label>
                <input
                  type="number"
                  id="tip-amount"
                  min="1"
                  max="10000"
                  step="0.01"
                  placeholder="Ex: 50"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiro-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={handleSendTip}
                disabled={loading || !tipAmount}
                className="bg-yellow-600 hover:bg-yellow-700 text-white whitespace-nowrap disabled:opacity-50"
              >
                {loading ? "Traitement..." : "Envoyer le pourboire"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TipSection;