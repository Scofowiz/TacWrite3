import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function usePremium() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/current"],
  });

  const isPremium = user?.subscriptionTier === "premium";
  const usageRemaining = user ? user.maxUsage - user.usageCount : 0;
  const usagePercentage = user ? (user.usageCount / user.maxUsage) * 100 : 0;

  return {
    isPremium,
    usageRemaining,
    usagePercentage,
    user,
  };
}
