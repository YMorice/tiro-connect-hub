import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { REALTIME_LISTEN_TYPES, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export const useRealtimeConnection = () => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleReconnect = useCallback(async () => {
    if (reconnectAttempts >= 5) {
      setStatus('error');
      setLastError('Max reconnection attempts reached');
      return;
    }

    setStatus('connecting');
    setReconnectAttempts(prev => prev + 1);
    
    try {
      // Simple way to test connection
      await supabase.from('users').select('count').limit(1);
      setStatus('connected');
      setReconnectAttempts(0);
      setLastError(null);
    } catch (error) {
      setTimeout(handleReconnect, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000));
    }
  }, [reconnectAttempts]);

  useEffect(() => {
    // Monitor connection status
    const channel = supabase.channel('connection-monitor');
    
    channel
      .subscribe((status) => {
        switch (status) {
          case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
            setStatus('connected');
            setReconnectAttempts(0);
            setLastError(null);
            break;
          case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
          case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
            setStatus('error');
            setLastError('Connection failed');
            handleReconnect();
            break;
          case REALTIME_SUBSCRIBE_STATES.CLOSED:
            setStatus('disconnected');
            handleReconnect();
            break;
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleReconnect]);

  const forceReconnect = useCallback(() => {
    setReconnectAttempts(0);
    handleReconnect();
  }, [handleReconnect]);

  return {
    status,
    reconnectAttempts,
    lastError,
    forceReconnect
  };
};