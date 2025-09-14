import React, { memo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Conversation } from '@/hooks/useMessaging';
import { cn } from '@/lib/utils';
import { ClipboardPen, Clapperboard, Palette, PenTool } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  loading: boolean;
}

const ConversationItem = memo(({ 
  conversation, 
  isSelected, 
  onClick 
}: { 
  conversation: Conversation; 
  isSelected: boolean; 
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "p-3 lg:p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
      isSelected && "bg-muted",
      conversation.hasUnreadMessages && "bg-primary/5 border-l-4 border-l-primary"
    )}
  >
    <div className="flex items-center space-x-3">
      <div className="relative">
        <Avatar className="w-8 h-8 lg:w-10 lg:h-10 flex-shrink-0">
          <AvatarFallback className="bg-tiro-black text-tiro-white text-xs lg:text-sm">
            {React.createElement(getPackIcon(conversation.packName), { 
              className: "w-4 h-4 lg:w-5 lg:h-5" 
            })}
          </AvatarFallback>
        </Avatar>
        {conversation.hasUnreadMessages && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background flex items-center justify-center">
            <span className="text-xs text-destructive-foreground font-medium">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            "font-medium text-foreground truncate text-sm",
            conversation.hasUnreadMessages && "font-bold"
          )}>
            {conversation.projectTitle}{conversation.packName ? ` - ${conversation.packName}` : ''}
          </h3>
          <time className="text-xs text-muted-foreground">
            {new Date(conversation.lastMessageTime).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short'
            })}
          </time>
        </div>
        <p className={cn(
          "text-xs text-muted-foreground truncate",
          conversation.hasUnreadMessages && "text-foreground font-medium"
        )}>
          {conversation.lastMessage}
        </p>
      </div>
    </div>
  </div>
));

const getPackIcon = (packName?: string) => {
  console.log('Pack name received:', packName); // Debug log
  switch (packName?.toLowerCase()) {
    case 'devis personnalisé':
      return ClipboardPen;
    case 'motion design':
      return Clapperboard;
    case 'identité visuelle':
    case 'pack identité visuelle':
      return Palette;
    case 'communication':
      return PenTool;
    case 'design de site web':
      return Clapperboard;
    default:
      return ClipboardPen;
  }
};

ConversationItem.displayName = 'ConversationItem';

export const ConversationList = memo(({ 
  conversations, 
  selectedConversation, 
  onSelectConversation, 
  loading 
}: ConversationListProps) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Aucune conversation pour le moment
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={selectedConversation?.id === conversation.id}
          onClick={() => onSelectConversation(conversation)}
        />
      ))}
    </div>
  );
});

ConversationList.displayName = 'ConversationList';