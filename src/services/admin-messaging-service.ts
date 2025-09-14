import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export interface DirectConversation {
  id: string;
  userId: string;
  adminId: string;
  userName: string;
  userEmail: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

/**
 * Create or get existing direct conversation between admin and user
 */
export const createOrGetDirectConversation = async (userId: string, adminId: string) => {
  try {
    // Check if a direct conversation already exists
    const { data: existingGroup, error: searchError } = await supabase
      .from('message_groups')
      .select('id_group')
      .eq('id_user', userId)
      .is('id_project', null) // Direct conversations have no project
      .limit(1)
      .single();

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw searchError;
    }

    let groupId: string;

    if (existingGroup) {
      // Conversation exists, return the group ID
      groupId = existingGroup.id_group;
    } else {
      // Create new direct conversation
      const newGroupId = crypto.randomUUID();
      
      // Insert two entries: one for the user, one for the admin
      const { error: insertError } = await supabase
        .from('message_groups')
        .insert([
          {
            id_group: newGroupId,
            id_user: userId,
            id_project: null // null for direct conversations
          },
          {
            id_group: newGroupId,
            id_user: adminId,
            id_project: null // null for direct conversations
          }
        ]);

      if (insertError) throw insertError;
      
      groupId = newGroupId;
      toast.success("Nouvelle conversation créée");
    }

    return { groupId, isNew: !existingGroup };
  } catch (error) {
    console.error('Error creating/getting direct conversation:', error);
    toast.error("Erreur lors de l'accès à la conversation");
    throw error;
  }
};

/**
 * Get all direct conversations for admin
 */
export const getAdminDirectConversations = async (adminId: string): Promise<DirectConversation[]> => {
  try {
    // Get all direct message groups where admin is a participant
    const { data: adminGroups, error: groupsError } = await supabase
      .from('message_groups')
      .select('id_group')
      .eq('id_user', adminId)
      .is('id_project', null);

    if (groupsError) throw groupsError;
    if (!adminGroups || adminGroups.length === 0) return [];

    const groupIds = adminGroups.map(g => g.id_group);

    // Get the other participants (non-admin users) in these groups
    const { data: otherParticipants, error: participantsError } = await supabase
      .from('message_groups')
      .select(`
        id_group,
        id_user,
        users (
          id_users,
          name,
          surname,
          email,
          role
        )
      `)
      .in('id_group', groupIds)
      .neq('id_user', adminId)
      .is('id_project', null);

    if (participantsError) throw participantsError;
    if (!otherParticipants) return [];

    // Get last message for each conversation
    const conversations: DirectConversation[] = await Promise.all(
      otherParticipants.map(async (participant) => {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at, read')
          .eq('group_id', participant.id_group)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('id_message')
          .eq('group_id', participant.id_group)
          .eq('read', false)
          .neq('sender_id', adminId);

        return {
          id: participant.id_group,
          userId: participant.id_user,
          adminId,
          userName: `${participant.users?.name || ''} ${participant.users?.surname || ''}`.trim(),
          userEmail: participant.users?.email || '',
          lastMessage: lastMessage?.content,
          lastMessageTime: lastMessage ? new Date(lastMessage.created_at) : undefined,
          unreadCount: unreadMessages?.length || 0
        };
      })
    );

    return conversations.sort((a, b) => {
      const timeA = a.lastMessageTime?.getTime() || 0;
      const timeB = b.lastMessageTime?.getTime() || 0;
      return timeB - timeA; // Most recent first
    });

  } catch (error) {
    console.error('Error getting admin direct conversations:', error);
    return [];
  }
};

/**
 * Navigate to messages page with specific conversation
 */
export const navigateToDirectConversation = (navigate: (path: string) => void, groupId: string) => {
  navigate(`/messages?conversation=${groupId}`);
};