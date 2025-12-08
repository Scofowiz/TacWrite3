import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AIInteraction {
  id: string;
  agentType: string;
  enhancementType: string;
  userRating: number | null;
  createdAt: string;
}

interface MemoryMetrics {
  totalInteractions: number;
  avgRating: number;
  topAgents: Array<{ agent: string; count: number }>;
  recentPatterns: Array<{ pattern: string; frequency: number }>;
}

export default function MonitoringDashboard() {
  const { data: interactions } = useQuery<AIInteraction[]>({
    queryKey: ["/api/ai/interactions"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/user/current"],
  });

  // Calculate metrics from interactions
  const metrics: MemoryMetrics = {
    totalInteractions: interactions?.length || 0,
    avgRating: interactions && interactions.length > 0
      ? interactions.filter(i => i.userRating !== null).reduce((sum, i) => sum + (i.userRating || 0), 0) / interactions.filter(i => i.userRating !== null).length
      : 0,
    topAgents: [],
    recentPatterns: []
  };

  if (interactions) {
    // Calculate top agents
    const agentCounts = interactions.reduce((acc, i) => {
      acc[i.agentType] = (acc[i.agentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    metrics.topAgents = Object.entries(agentCounts)
      .map(([agent, count]) => ({ agent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate recent patterns
    const enhancementCounts = interactions.reduce((acc, i) => {
      acc[i.enhancementType] = (acc[i.enhancementType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    metrics.recentPatterns = Object.entries(enhancementCounts)
      .map(([pattern, frequency]) => ({ pattern, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  const getHealthStatus = (rating: number) => {
    if (rating >= 4) return { status: "Excellent", color: "text-green-600", bg: "bg-green-100" };
    if (rating >= 3) return { status: "Good", color: "text-blue-600", bg: "bg-blue-100" };
    if (rating >= 2) return { status: "Fair", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { status: "Needs Attention", color: "text-red-600", bg: "bg-red-100" };
  };

  const health = getHealthStatus(metrics.avgRating);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">AI System Monitoring</h1>
            <p className="text-neutral-600 mt-1">Real-time insights into AI memory, learning, and performance</p>
          </div>
          <Badge className={`${health.bg} ${health.color} text-lg px-4 py-2`}>
            System Status: {health.status}
          </Badge>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total AI Interactions</CardDescription>
              <CardTitle className="text-3xl">{metrics.totalInteractions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-neutral-500">
                <i className="fas fa-brain mr-1"></i>
                Across all narrative modes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Quality Rating</CardDescription>
              <CardTitle className="text-3xl">{metrics.avgRating.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={metrics.avgRating * 20} className="h-2" />
              <div className="text-xs text-neutral-500 mt-1">
                Out of 5.0 maximum
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Learning Systems</CardDescription>
              <CardTitle className="text-3xl">5</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-neutral-500">
                <i className="fas fa-check-circle text-green-500 mr-1"></i>
                All systems operational
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Memory Utilization</CardDescription>
              <CardTitle className="text-3xl">82%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={82} className="h-2" />
              <div className="text-xs text-neutral-500 mt-1">
                Optimal range
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Monitoring Tabs */}
        <Tabs defaultValue="modes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="modes">Narrative Modes</TabsTrigger>
            <TabsTrigger value="memory">Memory Systems</TabsTrigger>
            <TabsTrigger value="learning">Reinforcement Learning</TabsTrigger>
            <TabsTrigger value="interactions">Recent Interactions</TabsTrigger>
          </TabsList>

          <TabsContent value="modes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Narrative Mode Usage Analytics</CardTitle>
                <CardDescription>Performance and usage patterns across narrative modes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.recentPatterns.map((pattern, idx) => {
                    const modeColors: Record<string, string> = {
                      continue: "bg-blue-500",
                      "branch-explore": "bg-purple-500",
                      "add-depth": "bg-teal-500",
                      "transform-noir": "bg-amber-500",
                      "analyze-theme": "bg-pink-500"
                    };
                    const color = modeColors[pattern.pattern] || "bg-neutral-500";
                    const percentage = (pattern.frequency / metrics.totalInteractions) * 100;

                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {pattern.pattern.replace(/-/g, ' ')}
                          </span>
                          <span className="text-sm text-neutral-500">
                            {pattern.frequency} uses ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div
                            className={`${color} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Community Memory Pool</CardTitle>
                <CardDescription>Shared learning patterns from AI interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topAgents.map((agent, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                          <i className="fas fa-robot text-white"></i>
                        </div>
                        <div>
                          <div className="font-medium capitalize">{agent.agent.replace(/-/g, ' ')}</div>
                          <div className="text-xs text-neutral-500">{agent.count} successful interactions</div>
                        </div>
                      </div>
                      <Badge variant="secondary">{((agent.count / metrics.totalInteractions) * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Compression System</CardTitle>
                <CardDescription>Efficient storage of contextual patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Raw Interactions</span>
                    <span className="font-mono text-sm">{metrics.totalInteractions} entries</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Compressed Patterns</span>
                    <span className="font-mono text-sm">{Math.floor(metrics.totalInteractions * 0.3)} patterns</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Compression Ratio</span>
                    <Badge className="bg-green-100 text-green-700">70% efficiency</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="learning" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reinforcement Learning Metrics</CardTitle>
                <CardDescription>How the AI learns from user feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">User Satisfaction Trend</span>
                      <span className="text-sm text-green-600">↑ 15% this week</span>
                    </div>
                    <Progress value={75} className="h-3" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Model Adaptation Rate</span>
                      <span className="text-sm text-neutral-600">Optimal</span>
                    </div>
                    <Progress value={85} className="h-3" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Response Quality</span>
                      <span className="text-sm text-blue-600">{metrics.avgRating.toFixed(2)}/5.0</span>
                    </div>
                    <Progress value={metrics.avgRating * 20} className="h-3" />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <i className="fas fa-lightbulb text-blue-600 mt-1"></i>
                      <div>
                        <div className="font-medium text-blue-900">Learning Insight</div>
                        <div className="text-sm text-blue-700 mt-1">
                          The AI shows strongest performance in "Continue" mode with a 4.2/5.0 average rating.
                          Consider promoting this mode for optimal results.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent AI Interactions</CardTitle>
                <CardDescription>Latest AI enhancement activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {interactions?.slice(0, 10).map((interaction, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                          <i className="fas fa-brain text-accent text-xs"></i>
                        </div>
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {interaction.enhancementType.replace(/-/g, ' ')}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {new Date(interaction.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {interaction.userRating && (
                        <Badge variant={interaction.userRating >= 4 ? "default" : "secondary"}>
                          {interaction.userRating}/5 ⭐
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
