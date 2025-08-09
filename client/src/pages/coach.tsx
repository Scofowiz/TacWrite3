/**
 * Premium Writing Coach Page
 * 
 * Full-time analytical writing mentor with wit and market intelligence
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, TrendingUp, Target, Lightbulb, BarChart3, MessageCircle, Sparkles } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CoachingSession {
  success: boolean;
  coaching: {
    coachingType: string;
    personalizedMessage: string;
    styleInsights: string[];
    marketIntelligence: string[];
    actionableAdvice: Array<{
      category: string;
      suggestion: string;
      difficulty: 'easy' | 'moderate' | 'challenging';
      marketRelevance: number;
    }>;
    encouragement: string;
    nextSessionFocus: string;
    confidence: number;
    analyticsUsed?: {
      totalInteractions: number;
      averageQuality: number;
      wordsAnalyzed: number;
      recentSessions: number;
    };
  };
  sessionId: string;
  nextSessionRecommended: string;
}

export default function CoachPage() {
  const [sessionType, setSessionType] = useState<string>('daily_checkin');
  const [recentWriting, setRecentWriting] = useState('');
  const [specificQuestion, setSpecificQuestion] = useState('');
  const queryClient = useQueryClient();

  // Get user data to check premium status
  const { data: user } = useQuery({
    queryKey: ['/api/user/current'],
  });

  // Conduct coaching session mutation
  const coachingMutation = useMutation({
    mutationFn: async (sessionData: any): Promise<CoachingSession> => {
      const response = await fetch('/api/coach/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to conduct coaching session');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    },
  });

  const handleCoachingSession = async () => {
    coachingMutation.mutate({
      sessionType,
      recentWriting: recentWriting.trim() || undefined,
      specificQuestion: specificQuestion.trim() || undefined,
      documentId: null,
    });
  };

  const sessionTypes = [
    { id: 'daily_checkin', name: 'Daily Check-in', icon: MessageCircle, description: 'Regular progress review and motivation' },
    { id: 'style_analysis', name: 'Style Analysis', icon: Brain, description: 'Deep dive into your writing patterns' },
    { id: 'market_insights', name: 'Market Intelligence', icon: TrendingUp, description: 'Current trends and opportunities' },
    { id: 'growth_planning', name: 'Growth Planning', icon: Target, description: 'Strategic skill development roadmap' },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'challenging': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getMarketRelevanceStars = (relevance: number) => {
    return '⭐'.repeat(Math.floor(relevance / 2));
  };

  if (!user || (user as any).subscriptionTier !== 'premium') {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle>Premium Writing Coach</CardTitle>
            <CardDescription>
              Get personalized coaching based on your analytics and current market trends
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-6 text-muted-foreground">
              The Premium Writing Coach analyzes your writing patterns, provides market intelligence,
              and offers personalized guidance with a touch of wit to help you grow as a writer.
            </p>
            <Button size="lg">
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Premium Writing Coach</h1>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">AI-Powered</Badge>
        </div>
        <p className="text-muted-foreground text-lg">
          Your analytical writing mentor with market intelligence and a touch of wit
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coaching Session Setup */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Start a Coaching Session</CardTitle>
              <CardDescription>
                Choose your session type and provide any specific context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Session Type Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Session Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {sessionTypes.map((type) => (
                    <Card 
                      key={type.id}
                      className={`cursor-pointer transition-all ${
                        sessionType === type.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                      onClick={() => setSessionType(type.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <type.icon className="h-5 w-5" />
                          <span className="font-medium">{type.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recent Writing Sample */}
              <div>
                <label htmlFor="recent-writing" className="text-sm font-medium mb-2 block">
                  Recent Writing (Optional)
                </label>
                <Textarea
                  id="recent-writing"
                  placeholder="Paste a sample of your recent writing for personalized analysis..."
                  value={recentWriting}
                  onChange={(e) => setRecentWriting(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Providing a writing sample helps the coach give more specific feedback
                </p>
              </div>

              {/* Specific Question */}
              <div>
                <label htmlFor="specific-question" className="text-sm font-medium mb-2 block">
                  Specific Question (Optional)
                </label>
                <Textarea
                  id="specific-question"
                  placeholder="Is there something specific you'd like coaching on? e.g., 'How can I improve my dialogue?' or 'What market trends should I consider?'"
                  value={specificQuestion}
                  onChange={(e) => setSpecificQuestion(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleCoachingSession}
                disabled={coachingMutation.isPending}
                size="lg"
                className="w-full"
              >
                {coachingMutation.isPending ? 'Analyzing your writing...' : 'Start Coaching Session'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Your Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coachingMutation.data?.coaching?.analyticsUsed ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Interactions</p>
                    <p className="text-2xl font-bold">{coachingMutation.data?.coaching?.analyticsUsed?.totalInteractions || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Quality</p>
                    <p className="text-2xl font-bold">{(coachingMutation.data?.coaching?.analyticsUsed?.averageQuality || 0).toFixed(1)}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Words Analyzed</p>
                    <p className="text-2xl font-bold">{(coachingMutation.data?.coaching?.analyticsUsed?.wordsAnalyzed || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recent Sessions</p>
                    <p className="text-2xl font-bold">{coachingMutation.data?.coaching?.analyticsUsed?.recentSessions || 0}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Start a coaching session to see your personalized analytics
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Coaching Response */}
      {coachingMutation.data && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Coaching Session Results
            </CardTitle>
            <CardDescription>
              Session ID: {coachingMutation.data?.sessionId} • 
              Confidence: {Math.round((coachingMutation.data?.coaching?.confidence || 0) * 100)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="message" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="message">Coaching</TabsTrigger>
                <TabsTrigger value="insights">Style Insights</TabsTrigger>
                <TabsTrigger value="market">Market Intel</TabsTrigger>
                <TabsTrigger value="advice">Action Plan</TabsTrigger>
              </TabsList>

              <TabsContent value="message" className="space-y-4">
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                    {coachingMutation.data?.coaching?.personalizedMessage || 'No coaching message available'}
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    💪 {coachingMutation.data?.coaching?.encouragement || 'Keep up the great work!'}
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Next Session Focus:</p>
                  <p className="text-blue-700 dark:text-blue-300">{coachingMutation.data?.coaching?.nextSessionFocus || 'Continue building your skills'}</p>
                </div>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
                <div className="grid gap-4">
                  {(coachingMutation.data?.coaching?.styleInsights || []).map((insight: string, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Brain className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                          <p>{insight}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="market" className="space-y-4">
                <div className="grid gap-4">
                  {(coachingMutation.data?.coaching?.marketIntelligence || []).map((intel: string, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <TrendingUp className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                          <p>{intel}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="advice" className="space-y-4">
                <div className="grid gap-4">
                  {(coachingMutation.data?.coaching?.actionableAdvice || []).map((advice: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <Lightbulb className="h-5 w-5 text-yellow-600 mt-1 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-sm text-muted-foreground mb-1">{advice.category}</p>
                              <p>{advice.suggestion}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <Badge className={getDifficultyColor(advice.difficulty)}>
                              {advice.difficulty}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {getMarketRelevanceStars(advice.marketRelevance)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {coachingMutation.isError && (
        <Card className="mt-6 border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <Brain className="h-5 w-5" />
              <p>Unable to conduct coaching session. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}