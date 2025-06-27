import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  amount: number;
  clientSecret: string;
  onPaymentSuccess?: () => void;
}

export const PaymentForm = ({ amount, clientSecret, onPaymentSuccess }: Props) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProc] = useState(false);
  const [error, setErr] = useState<string>();

  useEffect(() => {
    if (elements) {
      const cardElement = elements.getElement(CardElement);
      console.log('Stripe loaded:', !!stripe);
      console.log('Elements loaded:', !!elements);
      console.log('CardElement exists:', !!cardElement);
    }
  }, [elements, stripe]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProc(true);
    setErr(undefined);

    const card = elements.getElement(CardElement);
    if (!card) {
      setErr('Erreur : carte non disponible.');
      setProc(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (error) {
      setErr(error.message ?? 'Paiement refusé');
    } else if (paymentIntent?.status === 'succeeded') {
      await supabase.functions.invoke('confirm-payment', {
        body: { paymentIntentId: paymentIntent.id },
      });
      onPaymentSuccess?.();
    }
    setProc(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-gray-50">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': { color: '#aab7c4' },
              },
            },
          }}
        />
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          <span className="flex items-center">
            Paiement sécurisé par Stripe
          </span>
          <img
            src="/stripe-logo.png"
            alt="Paiement sécurisé – Powered by Stripe"
            className="h-[18px] w-auto"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center p-3 text-red-800 bg-red-100 rounded-lg">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-tiro-primary hover:bg-tiro-primary/90"
        disabled={!stripe || !elements || processing}
      >
        {processing ? (
          <>
            <Clock className="h-4 w-4 mr-2 animate-spin" />
            Traitement…
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Payer&nbsp;{amount.toLocaleString('fr-FR')} €
          </>
        )}
      </Button>
    </form>
  );
};
