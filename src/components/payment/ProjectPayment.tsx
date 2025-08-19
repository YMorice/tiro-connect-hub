
import { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { PaymentForm } from '@/components/payment/PaymentForm';

const stripePromise = loadStripe("pk_test_VOTRE_CLE_PUBLIQUE_STRIPE_TEST");

interface Props {
  projectId: string;
  projectTitle: string;
  amount: number;
  paymentStatus?: 'pending' | 'succeeded' | 'processing' | 'failed';
  onPaymentSuccess?: () => void;
}

export const ProjectPayment = ({
  projectId,
  projectTitle,
  amount,
  paymentStatus = 'pending',
  onPaymentSuccess,
}: Props) => {
  const [clientSecret, setSecret] = useState<string>();
  const [paymentIntentId, setPaymentIntentId] = useState<string>();
  const [loading, setLoad] = useState(true);
  const [error, setError] = useState<string>();

  /* 1) Récupérer le client_secret à l'ouverture */
  useEffect(() => {
    (async () => {
      setLoad(true);
      try {
        console.log('Creating payment intent for project:', projectId);
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { projectId },
        });
        if (error) {
          console.error('Error creating payment intent:', error);
          setError(error.message);
        } else {
          console.log('Payment intent response:', data);
          setSecret(data.client_secret);
          setPaymentIntentId(data.payment_intent_id);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Erreur inattendue lors de la création du paiement');
      }
      setLoad(false);
    })();
  }, [projectId]);

  /* 2) Affichage du status global (succès) */
  if (paymentStatus === 'succeeded') {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Paiement Confirmé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-gray-600">
            Le paiement de <strong>{amount.toLocaleString('fr-FR')} €</strong> pour le projet
            <strong> "{projectTitle}"</strong> a été effectué avec succès.
          </p>
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" /> Payé
          </Badge>
        </CardContent>
      </Card>
    );
  }

  console.log('Client Secret:', clientSecret);
  console.log('Payment Intent ID:', paymentIntentId);

  /* 3) Carte principale — paiement requis */
  return (
    <Card className="border-l-4 border-l-tiro-primary">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-tiro-black" />
          Paiement Requis
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-gray-600">
            Pour activer votre projet <strong>"{projectTitle}"</strong>,
            veuillez effectuer le paiement de <strong>{amount.toLocaleString('fr-FR')} €</strong>.
          </p>
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" /> En attente
          </Badge>
        </div>

        {loading && (
          <div className="flex items-center justify-center p-6">
            <Clock className="h-5 w-5 mr-2 animate-spin" />
            <span>Préparation du paiement…</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center p-3 text-red-800 bg-red-100 rounded-lg">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </div>
        )}

        {clientSecret && paymentIntentId && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              amount={amount}
              clientSecret={clientSecret}
              paymentIntentId={paymentIntentId}
              onPaymentSuccess={() => {
                toast.success('Paiement effectué avec succès ! Le projet est maintenant actif.');
                onPaymentSuccess?.();
              }}
            />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
};
