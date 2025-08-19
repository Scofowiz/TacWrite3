import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Document, User } from "@shared/schema";

interface AiAssistantPanelProps {
  document: Document;
  onClose: () => void;
  onPremiumFeature: () => void;
}

export default function AiAssistantPanel({
  document,
  onClose,
  onPremiumFeature
}: AiAssistantPanelProps) {
  const [selectedText, setSelectedText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/current"],
  });

  const enhanceTextMutation = useMutation({
    mutationFn: async (data: { text: string; enhancementType: string }) => {
      const response = await apiRequest("POST", "/api/ai/enhance", {
        text: data.text,
        enhancementType: data.enhancementType,
        documentId: document.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Text Enhanced",
        description: `Quality score: ${data.qualityScore}/10`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/current"] });
    },
    onError: (error: any) => {
      if (error.message.includes("Usage limit reached")) {
        onPremiumFeature();
      } else {
        toast({
          title: "Enhancement Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleEnhancement = (type: string) => {
    const text = selectedText || document.content || "Sample text for enhancement";
    enhanceTextMutation.mutate({ text, enhancementType: type });
  };

  const usagePercentage = user ? (user.usageCount / user.maxUsage) * 100 : 0;

  return (
    <div className="absolute right-6 top-6 w-80 bg-white rounded-lg shadow-lg border border-neutral-200 z-20">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
              <i className="fas fa-magic text-white text-xs"></i>
            </div>
            <h3 className="text-sm font-medium text-neutral-800">AI Writing Assistant</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <i className="fas fa-times text-sm"></i>
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Current Suggestion */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5">
              <i className="fas fa-lightbulb text-white text-xs"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-800 mb-1">Enhancement Suggestion</p>
              <p className="text-sm text-neutral-600">
                The highlighted paragraph could benefit from more specific data and examples to support the claims.
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => handleEnhancement("clarity")}
                  disabled={enhanceTextMutation.isPending}
                  className="text-xs"
                >
                  {enhanceTextMutation.isPending ? "Enhancing..." : "Apply Enhancement"}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs">
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-sm font-medium text-neutral-700 mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhancement("continue")}
              disabled={enhanceTextMutation.isPending}
              className="p-2 h-auto flex flex-col items-center text-xs"
            >
              <i className="fas fa-plus-circle text-accent mb-1"></i>
              <span>Continue Writing</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhancement("polish")}
              disabled={enhanceTextMutation.isPending}
              className="p-2 h-auto flex flex-col items-center text-xs"
            >
              <i className="fas fa-edit text-primary mb-1"></i>
              <span>Polish Text</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhancement("auto-complete")}
              disabled={enhanceTextMutation.isPending}
              className="p-2 h-auto flex flex-col items-center text-xs"
            >
              <i className="fas fa-magic text-secondary mb-1"></i>
              <span>Auto-Complete</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhancement("market-insights")}
              disabled={enhanceTextMutation.isPending}
              className="p-2 h-auto flex flex-col items-center text-xs"
            >
              <i className="fas fa-chart-line text-orange-500 mb-1"></i>
              <span>Market Insights</span>
            </Button>
          </div>
        </div>

        {/* Usage Tracking */}
        {user && user.subscriptionTier === "free" && (
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-600">Free Assists Used</span>
              <span className="text-xs text-neutral-600">{user.usageCount}/{user.maxUsage}</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              {user.maxUsage - user.usageCount} assists remaining.{" "}
              <button
                onClick={onPremiumFeature}
                className="text-secondary hover:underline"
              >
                Upgrade for unlimited access
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
