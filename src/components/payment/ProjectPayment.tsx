
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react';

// Initialize Stripe - using test key for now
const stripePromise = loadStripe('pk_test_51HdSGwDai9u72qeMPgHyLEKEqJ8Z4C2fYBj6uX9R9gXL3vMdG8gYqzG1Fa0YN2JhgTRIyZBU4DYSHAfyqzQ4k00Z00ZXwO7I3B');

interface ProjectPaymentProps {
  projectId: string;
  projectTitle: string;
  amount: number;
  paymentStatus?: string;
  onPaymentSuccess?: () => void;
}

const PaymentForm: React.FC<{
  projectId: string;
  projectTitle: string;
  amount: number;
  onPaymentSuccess?: () => void;
}> = ({ projectId, projectTitle, amount, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { projectId }
        });

        if (error) throw error;

        setClientSecret(data.client_secret);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        setPaymentError('Erreur lors de la création du paiement');
        toast.error('Erreur lors de la création du paiement');
      }
    };

    createPaymentIntent();
  }, [projectId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setPaymentError('Élément de carte non trouvé');
      setIsProcessing(false);
      return;
    }

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on our backend
        const { error: confirmError } = await supabase.functions.invoke('confirm-payment', {
          body: { paymentIntentId: paymentIntent.id }
        });

        if (confirmError) throw confirmError;

        toast.success('Paiement effectué avec succès ! Votre projet est maintenant actif.');
        onPaymentSuccess?.();
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur de paiement inconnue';
      setPaymentError(errorMessage);
      toast.error(`Erreur de paiement: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-gray-50">
        <CardElement options={cardElementOptions} />
      </div>
      
      {paymentError && (
        <div className="flex items-center p-3 text-red-800 bg-red-100 rounded-lg">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">{paymentError}</span>
        </div>
      )}

      <Button 
        type="submit" 
        disabled={!stripe || isProcessing || !clientSecret}
        className="w-full bg-tiro-primary hover:bg-tiro-primary/90"
      >
        {isProcessing ? (
          <>
            <Clock className="h-4 w-4 mr-2 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Payer {amount.toLocaleString('fr-FR')} €
          </>
        )}
      </Button>
    </form>
  );
};

const ProjectPayment: React.FC<ProjectPaymentProps> = ({
  projectId,
  projectTitle,
  amount,
  paymentStatus = 'pending',
  onPaymentSuccess
}) => {
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'succeeded':
        return { label: 'Payé', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'processing':
        return { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: Clock };
      case 'failed':
        return { label: 'Échec', color: 'bg-red-100 text-red-800', icon: AlertCircle };
      default:
        return { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    }
  };

  const statusInfo = getStatusDisplay(paymentStatus);
  const StatusIcon = statusInfo.icon;

  if (paymentStatus === 'succeeded') {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Paiement Confirmé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-gray-600">
              Le paiement de <strong>{amount.toLocaleString('fr-FR')} €</strong> pour le projet 
              <strong> "{projectTitle}"</strong> a été effectué avec succès.
            </p>
            <Badge className={statusInfo.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-600" />
          Paiement Requis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-gray-600">
            Pour activer votre projet <strong>"{projectTitle}"</strong>, 
            veuillez effectuer le paiement de <strong>{amount.toLocaleString('fr-FR')} €</strong>.
          </p>
          <Badge className={statusInfo.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>

        <Elements stripe={stripePromise}>
          <PaymentForm
            projectId={projectId}
            projectTitle={projectTitle}
            amount={amount}
            onPaymentSuccess={onPaymentSuccess}
          />
        </Elements>
      </CardContent>
    </Card>
  );
};

export default ProjectPayment;
