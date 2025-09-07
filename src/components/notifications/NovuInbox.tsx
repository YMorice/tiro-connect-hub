import { Inbox } from '@novu/react';
import { useAuth } from '@/context/auth-context';

interface NovuInboxProps {
  className?: string;
}

export function NovuInbox({ className }: NovuInboxProps) {
  const { user } = useAuth();

  // Ne pas afficher le composant si l'utilisateur n'est pas connecté
  if (!user?.id) {
    return null;
  }

  return (
    <div className={className}>
      <Inbox 
        applicationIdentifier="VOTRE_VRAI_APPLICATION_IDENTIFIER"
        subscriberId={user.id}
      />
    </div>
  );
}