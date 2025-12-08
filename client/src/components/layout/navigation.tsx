import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "@shared/schema";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/current"],
  });

  const getActiveTab = () => {
    if (location.includes("/tutoring")) return "tutoring";
    if (location.includes("/analytics")) return "analytics";
    if (location.includes("/coach")) return "coach";
    if (location.includes("/monitoring")) return "monitoring";
    return "editor";
  };

  const usagePercentage = user ? (user.usageCount / user.maxUsage) * 100 : 0;

  return (
    <nav className="bg-white border-b border-neutral-200 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-feather-alt text-white text-sm"></i>
            </div>
            <span className="text-xl font-bold text-neutral-800">TACWrite</span>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>

          {/* Tab Navigation */}
          <div className="hidden md:flex space-x-1">
            <Link href="/editor">
              <Button
                variant={getActiveTab() === "editor" ? "default" : "ghost"}
                size="sm"
                className="tab-button"
              >
                <i className="fas fa-edit mr-2"></i>
                Editor
              </Button>
            </Link>
            <Link href="/tutoring">
              <Button
                variant={getActiveTab() === "tutoring" ? "default" : "ghost"}
                size="sm"
                className="tab-button"
              >
                <i className="fas fa-graduation-cap mr-2"></i>
                Tutoring & Courses
              </Button>
            </Link>
            <Link href="/analytics">
              <Button
                variant={getActiveTab() === "analytics" ? "default" : "ghost"}
                size="sm"
                className="tab-button"
              >
                <i className="fas fa-chart-line mr-2"></i>
                Analytics
              </Button>
            </Link>
            <Link href="/coach">
              <Button
                variant={getActiveTab() === "coach" ? "default" : "ghost"}
                size="sm"
                className="tab-button"
              >
                <i className="fas fa-user-graduate mr-2"></i>
                Coach
              </Button>
            </Link>
            <Link href="/monitoring">
              <Button
                variant={getActiveTab() === "monitoring" ? "default" : "ghost"}
                size="sm"
                className="tab-button"
              >
                <i className="fas fa-chart-bar mr-2"></i>
                Monitoring
              </Button>
            </Link>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* All Features Available Badge */}
            <div className="hidden sm:flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                <i className="fas fa-check mr-1"></i>
                All Features Unlocked
              </Badge>
            </div>

            {/* User Menu */}
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <i className="fas fa-user text-white text-sm"></i>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
