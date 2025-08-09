import { AiInteraction, Document } from "@/types";

interface ActivityFeedProps {
  interactions: AiInteraction[];
  documents: Document[];
}

export default function ActivityFeed({ interactions, documents }: ActivityFeedProps) {
  
  const getDocumentTitle = (documentId?: string) => {
    if (!documentId) return "Unknown Document";
    const doc = documents.find(d => d.id === documentId);
    return doc?.title || "Unknown Document";
  };

  const getActivityIcon = (agentType: string) => {
    switch (agentType) {
      case "writing-assistant":
        return { icon: "fas fa-magic", color: "bg-accent/10 text-accent" };
      case "autonomous-writer":
        return { icon: "fas fa-robot", color: "bg-secondary/10 text-secondary" };
      case "wfa-agent":
        return { icon: "fas fa-chart-line", color: "bg-orange-500/10 text-orange-500" };
      default:
        return { icon: "fas fa-plus-circle", color: "bg-primary/10 text-primary" };
    }
  };

  const formatTimeAgo = (date: Date) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const getQualityColor = (score?: string) => {
    if (!score) return "text-neutral-400";
    const numScore = parseFloat(score);
    if (numScore >= 8.5) return "text-accent";
    if (numScore >= 7.5) return "text-primary";
    return "text-yellow-600";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="p-6 border-b border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-900">Recent Activity</h3>
      </div>
      <div className="divide-y divide-neutral-200">
        {interactions.slice(0, 10).map((interaction) => {
          const activityConfig = getActivityIcon(interaction.agentType);
          
          return (
            <div key={interaction.id} className="p-6 flex items-center space-x-4">
              <div className={`w-10 h-10 ${activityConfig.color} rounded-full flex items-center justify-center`}>
                <i className={activityConfig.icon}></i>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-800">
                  {interaction.enhancementType === "continue" && "Enhanced paragraph"}
                  {interaction.enhancementType === "polish" && "Polished text"}
                  {interaction.enhancementType === "clarity" && "Improved clarity"}
                  {!interaction.enhancementType && "AI assistance"}
                  {" "}in "{getDocumentTitle(interaction.documentId)}"
                </p>
                <p className="text-sm text-neutral-600">
                  {interaction.agentType === "writing-assistant" && "Enhanced text quality and readability"}
                  {interaction.agentType === "autonomous-writer" && "Generated new content automatically"}
                  {interaction.agentType === "wfa-agent" && "Provided market insights and trends"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600">{formatTimeAgo(interaction.createdAt)}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className={`w-2 h-2 ${getQualityColor(interaction.qualityScore).replace('text-', 'bg-')} rounded-full`}></div>
                  <span className={`text-xs ${getQualityColor(interaction.qualityScore)}`}>
                    Quality: {interaction.qualityScore ? parseFloat(interaction.qualityScore).toFixed(1) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        {interactions.length === 0 && (
          <div className="p-6 text-center">
            <i className="fas fa-clock text-2xl text-neutral-300 mb-2"></i>
            <p className="text-neutral-500">No activity yet</p>
            <p className="text-sm text-neutral-400">Start writing to see your activity feed</p>
          </div>
        )}
      </div>
    </div>
  );
}
