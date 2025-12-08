import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  type: "ai" | "user";
  content: string;
}

export default function AiTutorChat() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      type: "ai",
      content: "Hello! I'm your AI Writing Tutor, integrated with the Purdue OWL curriculum. I can help you with academic writing, citations (APA, MLA, Chicago), grammar, research skills, and the writing process. What would you like to learn about today?"
    }
  ]);

  const tutorMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      // Build context from recent chat history
      const recentContext = chatHistory.slice(-4).map(m =>
        `${m.type === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
      ).join('\n');

      const response = await apiRequest("POST", "/api/ai/tutor/chat", {
        message: userMessage,
        context: recentContext,
        lessonContext: "Purdue OWL Writing Curriculum - Research & Citation, Academic Writing, Grammar & Style, Writing Process"
      });
      return response.json();
    },
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, {
        type: "ai",
        content: data.response
      }]);
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Tutor chat error:', error);
      setChatHistory(prev => [...prev, {
        type: "ai",
        content: "I'm sorry, I encountered an issue. Please try asking your question again."
      }]);
      setIsLoading(false);
    }
  });

  const handleSendMessage = () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setChatHistory(prev => [...prev, { type: "user", content: userMessage }]);
    setMessage("");
    setIsLoading(true);

    tutorMutation.mutate(userMessage);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <i className="fas fa-graduation-cap text-white text-sm"></i>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">AI Writing Tutor</h3>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {/* Chat-like interface */}
          <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex space-x-3 ${msg.type === "user" ? "justify-end" : ""}`}>
                {msg.type === "ai" && (
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-robot text-white text-sm"></i>
                  </div>
                )}
                <div className={`rounded-lg p-3 max-w-sm ${
                  msg.type === "ai"
                    ? "bg-secondary/10 flex-1"
                    : "bg-primary/10"
                }`}>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.type === "user" && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-user text-white text-sm"></i>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-robot text-white text-sm"></i>
                </div>
                <div className="bg-secondary/10 rounded-lg p-3 flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-sm text-neutral-500 ml-2">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Ask about citations, grammar, writing process..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !message.trim()}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {isLoading ? (
                  <i className="fas fa-spinner fa-spin text-sm"></i>
                ) : (
                  <i className="fas fa-paper-plane text-sm"></i>
                )}
              </Button>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              Powered by Gemini AI with Purdue OWL curriculum
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
