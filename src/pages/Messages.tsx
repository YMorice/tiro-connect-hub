
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/context/message-context";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User } from "@/types";
import { cn } from "@/lib/utils";

// Mock users for demonstration (in a real app, this would come from an API)
const mockUsers = [
  {
    id: "1",
    name: "Jean Martin",
    role: "entrepreneur",
    avatar: "",
  },
  {
    id: "2",
    name: "Marie Dubois",
    role: "student",
    avatar: "",
  },
];

const Messages = () => {
  const { user } = useAuth();
  const { messages, sendMessage, getConversation, markAsRead } = useMessages();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSelectedUserId = queryParams.get("user") || "";

  const [selectedUserId, setSelectedUserId] = useState(initialSelectedUserId);
  const [newMessage, setNewMessage] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Filter users to show contacts
  const contacts = mockUsers.filter((contact) => contact.id !== user?.id);

  const conversation = selectedUserId ? getConversation(selectedUserId) : [];

  // Mark messages as read when conversation changes
  useEffect(() => {
    if (selectedUserId && conversation) {
      conversation
        .filter((msg) => msg.recipient === user?.id && !msg.read)
        .forEach((msg) => markAsRead(msg.id));
    }
  }, [selectedUserId, conversation, user?.id, markAsRead]);

  // Scroll to bottom when conversation changes
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newMessage.trim()) return;

    sendMessage(selectedUserId, newMessage);
    setNewMessage("");
  };

  const getContactName = (id: string) => {
    const contact = mockUsers.find((u) => u.id === id);
    return contact ? contact.name : "Unknown User";
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)]">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Contacts List */}
          <Card className="col-span-1 overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Contacts</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-4rem)]">
              {contacts.length > 0 ? (
                contacts.map((contact) => {
                  const unreadCount = messages.filter(
                    (msg) => msg.sender === contact.id && msg.recipient === user?.id && !msg.read
                  ).length;

                  return (
                    <div
                      key={contact.id}
                      className={cn(
                        "p-3 border-b cursor-pointer flex items-center justify-between",
                        selectedUserId === contact.id
                          ? "bg-tiro-purple/10"
                          : "hover:bg-gray-50"
                      )}
                      onClick={() => setSelectedUserId(contact.id)}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {contact.role}
                          </p>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <div className="bg-tiro-purple text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No contacts available
                </div>
              )}
            </div>
          </Card>

          {/* Conversation */}
          <Card className="col-span-1 md:col-span-3 flex flex-col">
            {selectedUserId ? (
              <>
                <div className="p-4 border-b flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-md font-semibold">
                    {getContactName(selectedUserId).charAt(0)}
                  </div>
                  <h2 className="ml-3 font-semibold">
                    {getContactName(selectedUserId)}
                  </h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversation.length > 0 ? (
                    conversation.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "max-w-[70%] p-3 rounded-lg",
                          msg.sender === user?.id
                            ? "bg-tiro-purple text-white ml-auto"
                            : "bg-gray-100 mr-auto"
                        )}
                      >
                        <p>{msg.content}</p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            msg.sender === user?.id
                              ? "text-white/70"
                              : "text-gray-500"
                          )}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-10">
                      No messages yet. Start a conversation!
                    </div>
                  )}
                  <div ref={messageEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2"
                  >
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="flex-1 min-h-[80px]"
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-tiro-purple hover:bg-tiro-purple/90 h-10 px-6"
                    >
                      Send
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a contact to start messaging
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
