import React from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRealtimeConnection, ConnectionStatus as Status } from '@/hooks/useRealtimeConnection';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className,
  showDetails = false 
}) => {
  const { status, reconnectAttempts, lastError, forceReconnect } = useRealtimeConnection();

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'En ligne';
      case 'connecting':
        return 'Connexion...';
      case 'disconnected':
        return 'Déconnecté';
      case 'error':
        return 'Erreur de connexion';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-blue-600';
      case 'disconnected':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (!showDetails && status === 'connected') {
    return null; // Don't show anything when connected and not showing details
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className={cn("text-sm font-medium", getStatusColor())}>
          {getStatusText()}
        </span>
        {(status === 'error' || status === 'disconnected') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={forceReconnect}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {showDetails && (status === 'error' || status === 'disconnected') && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {lastError || 'Les messages en temps réel sont temporairement indisponibles.'}
            {reconnectAttempts > 0 && (
              <span className="block mt-1 text-xs">
                Tentative de reconnexion {reconnectAttempts}/5
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};