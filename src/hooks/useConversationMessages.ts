import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Message, useMessaging } from './useMessaging';

const MESSAGES_PER_PAGE = 50;

export const useConversationMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const { refreshConversations } = useMessaging();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [sending, setSending] = useState(false);

  const userInfo = useMemo(() => ({
    id: user?.id,
    role: (user as any)?.role,
    avatar: (user as any)?.pp_link
  }), [user?.id, (user as any)?.role, (user as any)?.pp_link]);

  const fetchMessages = useCallback(async (pageNum = 0, reset = true) => {
    if (!conversationId || !userInfo.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, users:sender_id (pp_link, name, surname)')
        .eq('group_id', conversationId)
        .order('created_at', { ascending: false })
        .range(pageNum * MESSAGES_PER_PAGE, (pageNum + 1) * MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      const messagesWithDetails = (data || []).map((msg: any) => ({
        ...msg,
        sender_avatar: msg.users?.pp_link || '',
        sender_name: msg.users ? `${msg.users.name} ${msg.users.surname}` : '',
      })).reverse(); // Reverse to show oldest first

      if (reset) {
        setMessages(messagesWithDetails);
      } else {
        setMessages(prev => [...messagesWithDetails, ...prev]);
      }

      setHasMore(data?.length === MESSAGES_PER_PAGE);
      setPage(pageNum);

      // Mark messages as read only for unread messages from others
      if (messagesWithDetails.length > 0) {
        const unreadMessageIds = messagesWithDetails
          .filter(msg => !msg.read && msg.sender_id !== userInfo.id)
          .map(msg => msg.id_message);
        
        if (unreadMessageIds.length > 0) {
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id_message', unreadMessageIds);
          
          // Rafraîchir la liste des conversations pour mettre à jour les pastilles
          refreshConversations();
        }
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, userInfo.id, refreshConversations]);

  const loadMoreMessages = useCallback(() => {
    if (!loading && hasMore) {
      fetchMessages(page + 1, false);
    }
  }, [fetchMessages, loading, hasMore, page]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !conversationId || !userInfo.id || sending) return false;

    setSending(true);
    try {
      const newMessage = {
        group_id: conversationId,
        sender_id: userInfo.id,
        content: content.trim(),
        read: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select('*, users:sender_id (pp_link, name, surname)')
        .single();

      if (error) throw error;

      // Optimistically add the message to the UI
      const messageWithDetails = {
        ...data,
        sender_avatar: data.users?.pp_link || '',
        sender_name: data.users ? `${data.users.name} ${data.users.surname}` : '',
      };

      setMessages(prev => [...prev, messageWithDetails]);
      return true;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    } finally {
      setSending(false);
    }
  }, [conversationId, userInfo.id, sending]);

  // Reset when conversation changes
  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      setPage(0);
      setHasMore(true);
      fetchMessages(0, true);
    }
  }, [conversationId, fetchMessages]);

  // Real-time updates for new messages in this conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${conversationId}`
        },
        async (payload) => {
          // Only add if it's not from current user (to avoid duplicates)
          if (payload.new.sender_id !== userInfo.id) {
            // Fetch the complete message with user details
            const { data } = await supabase
              .from('messages')
              .select('*, users:sender_id (pp_link, name, surname)')
              .eq('id_message', payload.new.id_message)
              .single();

            if (data) {
              const messageWithDetails = {
                ...data,
                sender_avatar: data.users?.pp_link || '',
                sender_name: data.users ? `${data.users.name} ${data.users.surname}` : '',
              };
              
              // Add message with subtle animation hint
              setMessages(prev => [...prev, { ...messageWithDetails, isNew: true }]);
              
              // Remove animation hint after a short delay
              setTimeout(() => {
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id_message === messageWithDetails.id_message 
                      ? { ...msg, isNew: false }
                      : msg
                  )
                );
              }, 2000);
              
              // Mark as read immediately since user is viewing the conversation
              await supabase
                .from('messages')
                .update({ read: true })
                .eq('id_message', data.id_message);
              
              // Don't refresh all conversations, they're updated by useMessaging hook
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userInfo.id]);

  return {
    messages,
    loading,
    sending,
    hasMore,
    sendMessage,
    loadMoreMessages,
    refreshMessages: () => fetchMessages(0, true)
  };
};