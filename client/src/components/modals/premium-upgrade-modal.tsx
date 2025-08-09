import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumUpgradeModal({ isOpen, onClose }: PremiumUpgradeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      // In a real app, this would integrate with a payment processor
      const user = await queryClient.getQueryData(["/api/user/current"]) as any;
      if (!user) throw new Error("User not found");

      const response = await apiRequest("PATCH", `/api/user/${user.id}/subscription`, {
        subscriptionTier: "premium"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upgrade Successful!",
        description: "Welcome to TACWrite Pro. You now have unlimited access to all features.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/current"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Upgrade Failed",
        description: "There was an error processing your upgrade. Please try again.",
        variant: "destructive",
      });
    },
  });

  const features = [
    "Unlimited AI writing assistance",
    "Autonomous writing agent",
    "WFA market insights agent",
    "Multiple polish iterations",
    "Advanced analytics",
    "Priority support"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <i className="fas fa-crown text-white text-sm"></i>
            </div>
            <DialogTitle className="text-lg font-semibold">Upgrade to TACWrite Pro</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-neutral-900">
              $19<span className="text-base font-normal text-neutral-600">/month</span>
            </p>
            <p className="text-neutral-600">Unlock unlimited AI-powered writing assistance</p>
          </div>
          
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <i className="fas fa-check text-accent"></i>
                <span className="text-neutral-700">{feature}</span>
              </div>
            ))}
          </div>
          
          <Button
            onClick={() => upgradeMutation.mutate()}
            disabled={upgradeMutation.isPending}
            className="w-full bg-secondary text-white hover:bg-secondary/90 py-3"
          >
            {upgradeMutation.isPending ? "Processing..." : "Start Free 7-Day Trial"}
          </Button>
          
          <p className="text-center text-xs text-neutral-500">
            Cancel anytime. No commitment required.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
