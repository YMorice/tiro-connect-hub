import React, { memo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ArrowLeft, MoreVertical, FolderOpen, MessageCircle } from 'lucide-react';
import { Message, Conversation } from '@/hooks/useMessaging';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  hasMore: boolean;
  onSendMessage: (content: string) => Promise<boolean>;
  onLoadMore: () => void;
  onBack: () => void;
  newMessage: string;
  onNewMessageChange: (value: string) => void;
}

const MessageItem = memo(({ 
  message, 
  isOwn, 
  showAvatar,
  showTime 
}: { 
  message: Message; 
  isOwn: boolean; 
  showAvatar: boolean;
  showTime: boolean;
}) => (
  <div className={cn("flex gap-3", showAvatar ? "mb-4" : "mb-1", isOwn && "flex-row-reverse")}>
    {showAvatar && !isOwn && (
      <Avatar className="w-8 h-8 flex-shrink-0">
        {message.sender_avatar ? (
          <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {message.sender_name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        )}
      </Avatar>
    )}
    {!showAvatar && !isOwn && <div className="w-8" />}
    
    <div className={cn("max-w-[70%] flex flex-col", isOwn && "items-end")}>
      {showAvatar && !isOwn && (
        <div className={cn("text-xs text-muted-foreground mb-1", isOwn ? "text-right" : "text-left")}>
          {message.sender_name}
        </div>
      )}
      <div
        className={cn(
          "px-3 py-2 text-sm inline-block w-fit",
          isOwn 
            ? "rounded-t-lg rounded-l-lg bg-tiro-secondary text-tiro-white" 
            : "rounded-t-lg rounded-r-lg bg-muted text-foreground"
        )}
      >
        {message.content}
      </div>
      {showTime && (
        <div className={cn(
          "text-xs text-muted-foreground mt-1 font-clash",
          isOwn ? "text-right" : "text-left"
        )}>
          {new Date(message.created_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )}
    </div>
  </div>
));

MessageItem.displayName = 'MessageItem';

export const ChatArea = memo(({
  conversation,
  messages,
  loading,
  sending,
  hasMore,
  onSendMessage,
  onLoadMore,
  onBack,
  newMessage,
  onNewMessageChange
}: ChatAreaProps) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle scroll to load more messages
  const handleScroll = () => {
    if (!messagesContainerRef.current || loading || !hasMore) return;
    
    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0) {
      onLoadMore();
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    const success = await onSendMessage(newMessage);
    if (success) {
      onNewMessageChange('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p>Sélectionnez une conversation pour commencer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-border bg-tiro-white flex items-center gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {conversation.otherParticipant}
          </h3>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="p-4 space-y-2 min-h-full"
        >
          {loading && hasMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
          
          {messages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const prevMessage = messages[index - 1];
            const nextMessage = messages[index + 1];
            const showAvatar = !prevMessage || 
              prevMessage.sender_id !== message.sender_id ||
              new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 minutes

            // Show time only for the last message of the group
            const showTime = !nextMessage || 
              nextMessage.sender_id !== message.sender_id ||
              new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) !== 
              new Date(nextMessage.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            return (
              <MessageItem
                key={message.id_message}
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                showTime={showTime}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-tiro-white flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tapez votre message..."
            disabled={sending}
            className="flex-1 bg-tiro-white"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="icon"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground bg-tiro-gray1"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

ChatArea.displayName = 'ChatArea';