import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, AlertCircle } from "lucide-react";
import { apiClient } from "app";
import type { AppApisInvestorChatSendMessageResponse, ChatMessage } from "types";
import { useUser } from "@stackframe/react";
import { useActivityTracking } from "utils/useActivityTracking";

export interface Props {
  /** Position of the chat button */
  position?: 'bottom-right' | 'bottom-left';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function ChatWidget({ position = 'bottom-right' }: Props) {
  const user = useUser();
  const { trackActivity } = useActivityTracking();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [escalated, setEscalated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    if (newState) {
      trackActivity({
        type: 'click',
        element: 'Open Chat Widget',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    trackActivity({
      type: 'form_submit',
      element: 'Send Chat Message',
    });

    try {
      const response = await apiClient.send_investor_message({
        conversation_id: conversationId,
        message: inputValue,
      });

      const data: AppApisInvestorChatSendMessageResponse = await response.json();

      // Update conversation ID if this was first message
      if (!conversationId) {
        setConversationId(data.conversation_id);
      }

      // Add AI response
      const aiMessage: Message = {
        role: 'assistant',
        content: data.ai_response.content,
        created_at: data.ai_response.created_at
      };

      setMessages(prev => [...prev, aiMessage]);

      // Check if escalated
      if (data.escalated) {
        setEscalated(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact support.',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const positionClasses = position === 'bottom-right' 
    ? 'right-4 sm:right-6' 
    : 'left-4 sm:left-6';

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleToggle}
          className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50 bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110`}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50 w-[90vw] sm:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col`} style={{ height: '500px', maxHeight: '80vh' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Investor Support</h3>
                <p className="text-xs text-white/80">AI-powered assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              className="text-white hover:bg-white/20 p-1 rounded transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Escalation Warning */}
          {escalated && (
            <div className="bg-yellow-50 border-b border-yellow-200 p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900">Admin Review Requested</p>
                <p className="text-yellow-700">Your conversation has been flagged for admin review. An admin will respond soon.</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">Welcome, {user.displayName || 'Investor'}!</p>
                <p className="text-sm text-gray-500">Ask me anything about your investments, shares, or account.</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6d52a2] focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white p-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Press Enter to send</p>
          </div>
        </div>
      )}
    </>
  );
}
