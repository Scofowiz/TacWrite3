import { useState } from "react";
import { useLocation } from "wouter";
import EditorView from "./editor";
import TutoringView from "./tutoring";
import AnalyticsView from "./analytics";
import { TabType } from "@/types";

export default function Dashboard() {
  const [location] = useLocation();
  
  // Determine active tab from URL
  const getActiveTab = (): TabType => {
    if (location.includes("/tutoring")) return "tutoring";
    if (location.includes("/analytics")) return "analytics";
    return "editor";
  };

  const activeTab = getActiveTab();

  const renderTabContent = () => {
    switch (activeTab) {
      case "tutoring":
        return <TutoringView />;
      case "analytics":
        return <AnalyticsView />;
      case "editor":
      default:
        return <EditorView />;
    }
  };

  return (
    <div className="pt-16">
      {renderTabContent()}
    </div>
  );
}
