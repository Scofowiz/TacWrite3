import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RepetitionCheckerProps {
  content: string;
}

interface WordRepetition {
  word: string;
  count: number;
  percentage: number;
  suggestion: string;
}

const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
  'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
  'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its',
  'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
  'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any',
  'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has',
  'had', 'were', 'said', 'did', 'having', 'may', 'should', 'am'
]);

const SYNONYMS: Record<string, string[]> = {
  'said': ['stated', 'declared', 'mentioned', 'remarked', 'noted', 'replied', 'whispered', 'exclaimed'],
  'walked': ['strolled', 'strode', 'ambled', 'sauntered', 'marched', 'paced', 'wandered'],
  'looked': ['gazed', 'glanced', 'peered', 'stared', 'observed', 'watched', 'examined'],
  'went': ['traveled', 'journeyed', 'proceeded', 'advanced', 'headed', 'moved'],
  'big': ['large', 'enormous', 'massive', 'immense', 'vast', 'huge', 'substantial'],
  'small': ['tiny', 'minute', 'diminutive', 'compact', 'petite', 'little'],
  'good': ['excellent', 'superb', 'fine', 'wonderful', 'great', 'splendid'],
  'bad': ['poor', 'terrible', 'awful', 'dreadful', 'horrible', 'atrocious'],
  'happy': ['joyful', 'delighted', 'pleased', 'cheerful', 'content', 'elated'],
  'sad': ['sorrowful', 'melancholy', 'dejected', 'mournful', 'despondent'],
  'angry': ['furious', 'irate', 'enraged', 'livid', 'incensed', 'wrathful'],
  'thing': ['object', 'item', 'element', 'matter', 'entity', 'phenomenon'],
  'very': ['extremely', 'incredibly', 'remarkably', 'exceptionally', 'particularly'],
  'really': ['truly', 'genuinely', 'actually', 'certainly', 'indeed'],
  'just': ['simply', 'merely', 'only', 'barely', 'recently'],
  'suddenly': ['abruptly', 'unexpectedly', 'instantly', 'swiftly', 'rapidly'],
  'began': ['started', 'commenced', 'initiated', 'launched', 'embarked'],
  'felt': ['sensed', 'perceived', 'experienced', 'detected', 'noticed'],
  'knew': ['understood', 'realized', 'recognized', 'comprehended', 'grasped'],
  'turned': ['rotated', 'pivoted', 'swiveled', 'spun', 'twisted'],
};

export default function RepetitionChecker({ content }: RepetitionCheckerProps) {
  const [repetitions, setRepetitions] = useState<WordRepetition[]>([]);

  useEffect(() => {
    if (!content || content.trim().length === 0) {
      setRepetitions([]);
      return;
    }

    analyzeRepetitions(content);
  }, [content]);

  const analyzeRepetitions = (text: string) => {
    // Clean and tokenize
    const words = text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Ignore very short words

    const totalWords = words.length;
    if (totalWords === 0) {
      setRepetitions([]);
      return;
    }

    // Count occurrences
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      if (!COMMON_WORDS.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    // Find repetitions (words used more than 3 times OR more than 1% of total words)
    const reps: WordRepetition[] = [];
    Object.entries(wordCounts).forEach(([word, count]) => {
      const percentage = (count / totalWords) * 100;
      if (count > 3 || percentage > 1) {
        reps.push({
          word,
          count,
          percentage,
          suggestion: getSuggestion(word, count)
        });
      }
    });

    // Sort by count descending
    reps.sort((a, b) => b.count - a.count);

    // Take top 10
    setRepetitions(reps.slice(0, 10));
  };

  const getSuggestion = (word: string, count: number): string => {
    // Check if we have synonyms
    if (SYNONYMS[word]) {
      const syns = SYNONYMS[word].slice(0, 3).join(', ');
      return `Try varying with: ${syns}`;
    }

    // Generic suggestions based on count
    if (count > 10) {
      return `Used ${count} times - consider restructuring paragraphs to reduce repetition`;
    } else if (count > 7) {
      return `Appears ${count} times - try finding synonyms or rephrasing`;
    } else if (count > 5) {
      return `Shows up ${count} times - could benefit from variation`;
    } else {
      return `Repeated ${count} times - consider alternatives`;
    }
  };

  const getSeverityColor = (count: number, percentage: number) => {
    if (count > 10 || percentage > 2) {
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
    } else if (count > 7 || percentage > 1.5) {
      return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' };
    } else if (count > 5 || percentage > 1) {
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
    } else {
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
    }
  };

  if (repetitions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <i className="fas fa-sync text-accent"></i>
            Repetition Analysis
          </CardTitle>
          <CardDescription className="text-xs">
            No significant word repetitions detected
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <i className="fas fa-sync text-accent"></i>
          Repetition Analysis
        </CardTitle>
        <CardDescription className="text-xs">
          Words that appear frequently in your text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {repetitions.map((rep, idx) => {
          const colors = getSeverityColor(rep.count, rep.percentage);
          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${colors.text}`}>"{rep.word}"</span>
                  <Badge variant="secondary" className="text-xs">
                    {rep.count}x
                  </Badge>
                  <span className="text-xs text-neutral-500">
                    ({rep.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <p className={`text-xs ${colors.text} mt-1`}>
                <i className="fas fa-lightbulb mr-1"></i>
                {rep.suggestion}
              </p>
            </div>
          );
        })}

        {repetitions.length > 5 && (
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <p className="text-xs text-neutral-600">
              <i className="fas fa-info-circle mr-1"></i>
              Showing top {repetitions.length} repeated words. Use the AI "Deepen" mode to add variety.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
