import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TipPaymentProps {
  projectId: string;
  studentName?: string;
}

export const TipPayment: React.FC<TipPaymentProps> = ({ projectId, studentName }) => {
  const [tipAmount, setTipAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleTipPayment = async () => {
    const amount = parseFloat(tipAmount);
    
    if (!amount || amount < 1) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant valide (minimum 1€)",
        variant: "destructive",
      });
      return;
    }

    if (amount > 10000) {
      toast({
        title: "Erreur",
        description: "Le montant maximum est de 10 000€",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-tip-payment', {
        body: {
          project_id: projectId,
          tip_amount: Math.round(amount * 100), // Convert to cents
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error) {
      console.error('Erreur lors du paiement du pourboire:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'initialisation du paiement",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="bg-tiro-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-tiro-orange" />
          Donner un pourboire
        </CardTitle>
        <CardDescription>
          {studentName 
            ? `Montrez votre satisfaction en donnant un pourboire à ${studentName}` 
            : "Montrez votre satisfaction en donnant un pourboire à l'étudiant"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tip-amount">Montant du pourboire (€)</Label>
          <Input
            id="tip-amount"
            type="number"
            min="1"
            max="10000"
            step="0.01"
            placeholder="Ex: 10.00"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            className="text-right"
          />
        </div>
        
        <Button
          onClick={handleTipPayment}
          disabled={isProcessing || !tipAmount}
          className="w-full bg-tiro-orange hover:bg-tiro-orange/90"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <Gift className="mr-2 h-4 w-4" />
              Donner {tipAmount ? `${tipAmount}€` : 'un pourboire'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};