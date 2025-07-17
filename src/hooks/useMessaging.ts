import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export interface Conversation {
  id: string;
  projectId: string;
  projectTitle: string;
  otherParticipant: string;
  otherParticipantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  hasUnreadMessages: boolean;
  projectStatus: string;
  unreadCount: number;
}

export interface Message {
  id_message: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_avatar?: string;
  sender_name?: string;
  read: boolean;
}

export const useMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userInfo = useMemo(() => ({
    id: user?.id,
    role: (user as any)?.role,
    avatar: (user as any)?.pp_link
  }), [user?.id, (user as any)?.role, (user as any)?.pp_link]);

  const fetchConversations = useCallback(async () => {
    if (!userInfo.id) return;

    setLoading(true);
    setError(null);
    
    try {
      // Single optimized query based on user role
      let query = supabase.from('message_groups').select(`
        id_group,
        id_project,
        projects (
          title,
          status,
          id_entrepreneur,
          selected_student,
          entrepreneurs (
            users!entrepreneurs_id_user_fkey (name, surname, pp_link)
          ),
          students!projects_selected_student_fkey (
            users!students_id_user_fkey (name, surname, pp_link)
          )
        )
      `);

      // Role-specific filtering
      if (userInfo.role === 'entrepreneur') {
        const { data: entrepreneurData } = await supabase
          .from('entrepreneurs')
          .select('id_entrepreneur')
          .eq('id_user', userInfo.id)
          .single();
        
        if (!entrepreneurData) return;
        query = query.eq('projects.id_entrepreneur', entrepreneurData.id_entrepreneur);
      } else if (userInfo.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('id_student')
          .eq('id_user', userInfo.id)
          .single();
        
        if (!studentData) return;
        query = query
          .eq('projects.selected_student', studentData.id_student)
          .in('projects.status', ['STEP5', 'STEP6', 'completed']);
      }

      const { data: conversationsData, error } = await query;
      if (error) throw error;

      if (!conversationsData?.length) {
        setConversations([]);
        return;
      }

      const groupIds = conversationsData.map(g => g.id_group);

      // Batch fetch latest messages and unread counts
      const [messagesResult, unreadResult] = await Promise.all([
        supabase
          .from('messages')
          .select('group_id, content, created_at')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('group_id')
          .in('group_id', groupIds)
          .eq('read', false)
          .neq('sender_id', userInfo.id)
      ]);

      // Process data efficiently
      const messagesByGroup = new Map();
      const unreadByGroup = new Map();

      messagesResult.data?.forEach(msg => {
        if (!messagesByGroup.has(msg.group_id)) {
          messagesByGroup.set(msg.group_id, msg);
        }
      });

      unreadResult.data?.forEach(msg => {
        const count = unreadByGroup.get(msg.group_id) || 0;
        unreadByGroup.set(msg.group_id, count + 1);
      });

      // Transform to conversations
      const processedConversations = conversationsData
        .map(group => {
          if (!group.projects) return null;

          const latestMessage = messagesByGroup.get(group.id_group);
          const unreadCount = unreadByGroup.get(group.id_group) || 0;

          let otherParticipant = '';
          let otherParticipantAvatar = '';

          const project = group.projects;
          const entrepreneur = project.entrepreneurs?.users;
          const student = project.students?.users;

          if (userInfo.role === 'admin') {
            otherParticipant = entrepreneur 
              ? `${project.title} (${entrepreneur.name} ${entrepreneur.surname})` 
              : project.title;
            otherParticipantAvatar = entrepreneur?.pp_link || '';
          } else if (userInfo.role === 'entrepreneur') {
            if (project.selected_student && student) {
              otherParticipant = `${project.title} - ${student.name} ${student.surname}`;
              otherParticipantAvatar = student.pp_link || '';
            } else {
              otherParticipant = `${project.title} - Admin`;
            }
          } else if (userInfo.role === 'student') {
            otherParticipant = entrepreneur 
              ? `${project.title} - ${entrepreneur.name} ${entrepreneur.surname}` 
              : project.title;
            otherParticipantAvatar = entrepreneur?.pp_link || '';
          }

          return {
            id: group.id_group,
            projectId: group.id_project,
            projectTitle: project.title,
            projectStatus: project.status,
            otherParticipant,
            otherParticipantAvatar,
            lastMessage: latestMessage?.content || 'No messages yet',
            lastMessageTime: latestMessage?.created_at || new Date().toISOString(),
            hasUnreadMessages: unreadCount > 0,
            unreadCount
          };
        })
        .filter(Boolean) as Conversation[];

      // Sort: unread first, then by recent message
      processedConversations.sort((a, b) => {
        if (a.hasUnreadMessages && !b.hasUnreadMessages) return -1;
        if (!a.hasUnreadMessages && b.hasUnreadMessages) return 1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setConversations(processedConversations);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [userInfo.id, userInfo.role]);

  // Setup real-time updates
  useEffect(() => {
    if (!userInfo.id) return;

    fetchConversations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('messaging-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Refresh conversations when messages change
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, userInfo.id]);

  return {
    conversations,
    loading,
    error,
    refreshConversations: fetchConversations
  };
};