import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AiTutorChat() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      type: "ai",
      content: "I noticed you're working on APA citations. Would you like me to review your research paper draft and help identify where citations are needed?"
    },
    {
      type: "user",
      content: "Yes, that would be helpful. I'm not sure if I've cited everything correctly."
    },
    {
      type: "ai",
      content: "I've analyzed your document and found 3 places where citations could be improved. Would you like me to show you each one with suggestions?"
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setChatHistory(prev => [...prev, { type: "user", content: message }]);
    setMessage("");
    
    // Simulate AI response
    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        type: "ai",
        content: "Great question! Let me help you with that..."
      }]);
    }, 1000);
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
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {chatHistory.map((message, index) => (
              <div key={index} className={`flex space-x-3 ${message.type === "user" ? "justify-end" : ""}`}>
                {message.type === "ai" && (
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-robot text-white text-sm"></i>
                  </div>
                )}
                <div className={`rounded-lg p-3 max-w-xs ${
                  message.type === "ai" 
                    ? "bg-secondary/10 flex-1" 
                    : "bg-primary/10"
                }`}>
                  <p className="text-sm text-neutral-700">{message.content}</p>
                  {message.type === "ai" && index === chatHistory.length - 1 && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Button size="sm" className="bg-secondary text-white hover:bg-secondary/90 text-xs">
                        Yes, show me
                      </Button>
                      <Button variant="ghost" size="sm" className="text-secondary text-xs hover:underline">
                        Explain how you found them
                      </Button>
                    </div>
                  )}
                </div>
                {message.type === "user" && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-user text-white text-sm"></i>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Ask your AI tutor a question..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="text-sm"
              />
              <Button onClick={handleSendMessage} className="bg-primary text-white hover:bg-primary/90">
                <i className="fas fa-paper-plane text-sm"></i>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
