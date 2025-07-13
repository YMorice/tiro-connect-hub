import React, { useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatArea } from '@/components/messaging/ChatArea';
import { useMessaging, Conversation } from '@/hooks/useMessaging';
import { useConversationMessages } from '@/hooks/useConversationMessages';
import { cn } from '@/lib/utils';

const Messages = () => {
  const { conversations, loading: conversationsLoading } = useMessaging();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const {
    messages,
    loading: messagesLoading,
    sending,
    hasMore,
    sendMessage,
    loadMoreMessages
  } = useConversationMessages(selectedConversation?.id || null);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setNewMessage('');
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    return await sendMessage(content);
  }, [sendMessage]);

  const handleBack = useCallback(() => {
    setSelectedConversation(null);
  }, []);

  return (
    <AppLayout>
      <div className="fixed inset-x-0 top-[100px] bottom-0 flex flex-col lg:flex-row bg-background overflow-hidden">
        {/* Conversations List */}
        <div className={cn(
          "w-full lg:w-1/3 xl:w-1/4 border-r border-border flex flex-col bg-background min-h-0",
          selectedConversation && "hidden lg:flex"
        )}>
          <div className="p-3 lg:p-4 border-b border-border flex-shrink-0">
            <h2 className="text-lg font-semibold text-foreground">Messages</h2>
            {conversationsLoading && (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <ConversationList
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              loading={conversationsLoading}
            />
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col min-h-0",
          !selectedConversation && "hidden lg:flex"
        )}>
          <ChatArea
            conversation={selectedConversation}
            messages={messages}
            loading={messagesLoading}
            sending={sending}
            hasMore={hasMore}
            onSendMessage={handleSendMessage}
            onLoadMore={loadMoreMessages}
            onBack={handleBack}
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;