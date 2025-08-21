import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PaymentForm } from '@/components/payment/PaymentForm';

const stripePromise = loadStripe(import.meta.env.VITE_PUBLIC_STRIPE_PK_TEST!);

interface TipPaymentProps {
  projectId: string;
  studentName?: string;
}

export const TipPayment: React.FC<TipPaymentProps> = ({ projectId, studentName }) => {
  const [tipAmount, setTipAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>();
  const [paymentIntentId, setPaymentIntentId] = useState<string>();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
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

      if (data?.client_secret && data?.payment_intent_id) {
        setClientSecret(data.client_secret);
        setPaymentIntentId(data.payment_intent_id);
        setShowPaymentForm(true);
      } else {
        throw new Error('Données de paiement non reçues');
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

  if (showPaymentForm && clientSecret && paymentIntentId) {
    return (
      <Card className="bg-tiro-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-tiro-orange" />
            Paiement du pourboire - {tipAmount}€
          </CardTitle>
          <CardDescription>
            {studentName 
              ? `Pourboire pour ${studentName}` 
              : "Pourboire pour l'étudiant"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              amount={parseFloat(tipAmount)}
              clientSecret={clientSecret}
              paymentIntentId={paymentIntentId}
              onPaymentSuccess={() => {
                toast({
                  title: "Pourboire envoyé !",
                  description: "Votre pourboire a été envoyé avec succès.",
                });
                setShowPaymentForm(false);
                setTipAmount('');
                setClientSecret(undefined);
                setPaymentIntentId(undefined);
              }}
            />
          </Elements>
        </CardContent>
      </Card>
    );
  }

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
          <p className="text-xs text-gray-500">
            Saisissez un montant entre 1€ et 10 000€ pour activer le bouton de paiement
          </p>
        </div>
        
        <Button
          onClick={handleTipPayment}
          disabled={isProcessing || !tipAmount || parseFloat(tipAmount) < 1}
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