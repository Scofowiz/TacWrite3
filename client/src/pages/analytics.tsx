import { useQuery } from "@tanstack/react-query";
import StatsGrid from "@/components/analytics/stats-grid";
import ActivityFeed from "@/components/analytics/activity-feed";
import { AiInteraction, Document, User } from "@shared/schema";

export default function AnalyticsView() {
  const { data: interactions } = useQuery<AiInteraction[]>({
    queryKey: ["/api/analytics/interactions"],
  });

  const { data: documents } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/current"],
  });

  const calculateStats = () => {
    const totalDocuments = documents?.length || 0;
    const totalWords = documents?.reduce((sum: number, doc: Document) => sum + doc.wordCount, 0) || 0;
    const totalInteractions = interactions?.length || 0;
    const avgQualityScore = interactions?.length 
      ? interactions.reduce((sum: number, interaction: AiInteraction) => 
          sum + (parseFloat(interaction.qualityScore || '0') || 0), 0) / interactions.length 
      : 0;

    return {
      totalDocuments,
      totalWords,
      totalInteractions,
      avgQualityScore: Math.round(avgQualityScore * 10) / 10
    };
  };

  const stats = calculateStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Analytics Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Writing Analytics</h1>
        <p className="text-neutral-600 mt-2">Track your writing progress and AI agent performance</p>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Writing Progress Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="p-6 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">Writing Progress</h3>
            <p className="text-sm text-neutral-600">Words written over time</p>
          </div>
          <div className="p-6">
            <div className="h-64 bg-neutral-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-chart-area text-3xl text-neutral-300 mb-4"></i>
                <p className="text-neutral-500">Chart visualization would appear here</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Agent Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="p-6 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">AI Agent Performance</h3>
            <p className="text-sm text-neutral-600">Quality scores by agent type</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">Writing Assistant</span>
                  <span className="text-sm text-accent">8.7/10</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full" style={{ width: "87%" }}></div>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {interactions?.filter((i: any) => i.agentType === "writing-assistant").length || 0} uses • Avg response time: 1.2s
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">Contextual Enhancer</span>
                  <span className="text-sm text-primary">8.4/10</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "84%" }}></div>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {interactions?.filter((i: any) => i.agentType === "contextual-enhancer").length || 0} uses • Avg response time: 2.1s
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">Auto-Writer</span>
                  <span className="text-sm text-secondary">8.9/10</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-secondary h-2 rounded-full" style={{ width: "89%" }}></div>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {interactions?.filter((i: any) => i.agentType === "autonomous-writer").length || 0} uses • Premium feature
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <ActivityFeed interactions={interactions || []} documents={documents || []} />
    </div>
  );
}
