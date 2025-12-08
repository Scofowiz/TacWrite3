import { useMemo } from "react";
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

  // Calculate real agent performance metrics from interactions
  const agentMetrics = useMemo(() => {
    if (!interactions || interactions.length === 0) {
      return {
        writingAssistant: { score: 0, uses: 0, avgResponseTime: 0 },
        enhancer: { score: 0, uses: 0, avgResponseTime: 0 },
        autoWriter: { score: 0, uses: 0, avgResponseTime: 0 }
      };
    }

    const calculateAgentStats = (agentType: string) => {
      const agentInteractions = interactions.filter((i: AiInteraction) => i.agentType === agentType);
      const uses = agentInteractions.length;
      if (uses === 0) return { score: 0, uses: 0, avgResponseTime: 0 };

      const totalScore = agentInteractions.reduce((sum: number, i: AiInteraction) =>
        sum + (parseFloat(i.qualityScore || '0') || 0), 0);
      const avgScore = totalScore / uses;

      // Estimate response time from token count (rough approximation)
      const avgTokens = agentInteractions.reduce((sum: number, i: AiInteraction) =>
        sum + (i.tokensUsed || 0), 0) / uses;
      const avgResponseTime = Math.round((avgTokens / 100) * 10) / 10 || 1.0;

      return {
        score: Math.round(avgScore * 10) / 10,
        uses,
        avgResponseTime
      };
    };

    return {
      writingAssistant: calculateAgentStats("writing-assistant"),
      enhancer: calculateAgentStats("contextual-enhancer"),
      autoWriter: calculateAgentStats("autonomous-writer")
    };
  }, [interactions]);

  // Calculate writing progress by day for the chart
  const writingProgress = useMemo(() => {
    if (!documents || documents.length === 0) return [];

    const dayStats: Record<string, number> = {};
    documents.forEach((doc: Document) => {
      if (!doc.updatedAt) return;
      const dateObj = new Date(doc.updatedAt);
      if (isNaN(dateObj.getTime())) return;
      const date = dateObj.toLocaleDateString();
      dayStats[date] = (dayStats[date] || 0) + (doc.wordCount || 0);
    });

    return Object.entries(dayStats)
      .filter(([date]) => {
        const d = new Date(date);
        return !isNaN(d.getTime());
      })
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-7); // Last 7 days
  }, [documents]);

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
            <p className="text-sm text-neutral-600">Words written by document (last 7 days)</p>
          </div>
          <div className="p-6">
            {writingProgress.length > 0 ? (
              <div className="space-y-3">
                {writingProgress.map(([date, words]) => {
                  const maxWords = Math.max(...writingProgress.map(([, w]) => w as number));
                  const percentage = maxWords > 0 ? ((words as number) / maxWords) * 100 : 0;
                  return (
                    <div key={date}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-600">{date}</span>
                        <span className="text-xs font-medium text-neutral-800">{(words as number).toLocaleString()} words</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-center">
                <div>
                  <i className="fas fa-chart-area text-3xl text-neutral-300 mb-4"></i>
                  <p className="text-neutral-500">No writing data yet</p>
                  <p className="text-sm text-neutral-400">Start writing to see your progress</p>
                </div>
              </div>
            )}
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
                  <span className="text-sm text-accent">
                    {agentMetrics.writingAssistant.score > 0 ? `${agentMetrics.writingAssistant.score}/10` : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${agentMetrics.writingAssistant.score * 10}%` }}></div>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {agentMetrics.writingAssistant.uses} uses
                  {agentMetrics.writingAssistant.uses > 0 && ` • Avg response: ${agentMetrics.writingAssistant.avgResponseTime}s`}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">Contextual Enhancer</span>
                  <span className="text-sm text-primary">
                    {agentMetrics.enhancer.score > 0 ? `${agentMetrics.enhancer.score}/10` : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${agentMetrics.enhancer.score * 10}%` }}></div>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {agentMetrics.enhancer.uses} uses
                  {agentMetrics.enhancer.uses > 0 && ` • Avg response: ${agentMetrics.enhancer.avgResponseTime}s`}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">Auto-Writer</span>
                  <span className="text-sm text-secondary">
                    {agentMetrics.autoWriter.score > 0 ? `${agentMetrics.autoWriter.score}/10` : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-secondary h-2 rounded-full transition-all" style={{ width: `${agentMetrics.autoWriter.score * 10}%` }}></div>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {agentMetrics.autoWriter.uses} uses
                  {agentMetrics.autoWriter.uses > 0 && ` • Avg response: ${agentMetrics.autoWriter.avgResponseTime}s`}
                </p>
              </div>

              {!interactions?.length && (
                <div className="text-center py-4">
                  <p className="text-sm text-neutral-400">Use AI features to see performance metrics</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <ActivityFeed interactions={interactions || []} documents={documents || []} />
    </div>
  );
}
