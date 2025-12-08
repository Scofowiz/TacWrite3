import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface LessonContentProps {
  module: {
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      duration: number;
      completed: boolean;
    }>;
  };
  activeModule: string;
}

interface AnswerResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
  corrections: string[];
  praise: string;
}

export default function LessonContent({ module, activeModule }: LessonContentProps) {
  const [citationAnswer, setCitationAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const currentLesson = module.lessons[0]; // For demo, show first lesson

  const checkAnswerMutation = useMutation({
    mutationFn: async (answer: string) => {
      const response = await apiRequest("POST", "/api/ai/tutor/check-answer", {
        userAnswer: answer,
        expectedFormat: "APA",
        exerciseDescription: "Create an APA citation for a journal article",
        correctAnswer: "Smith, J. (2023). Climate change and agriculture. Environmental Science Review, 45, 123-145."
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAnswerResult(data);
      setIsChecking(false);
    },
    onError: () => {
      setAnswerResult({
        isCorrect: false,
        score: 0,
        feedback: "Could not check your answer. Please try again.",
        corrections: [],
        praise: ""
      });
      setIsChecking(false);
    }
  });

  const handleCheckAnswer = () => {
    if (!citationAnswer.trim()) return;
    setIsChecking(true);
    setAnswerResult(null);
    checkAnswerMutation.mutate(citationAnswer);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">{currentLesson.title}</h2>
            <p className="text-neutral-600 mt-1">Learn how to properly cite sources in APA format</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 bg-neutral-200 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: "40%" }}></div>
            </div>
            <span className="text-sm text-neutral-600">40% Complete</span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Lesson video/content area */}
        <div className="bg-neutral-100 rounded-lg p-8 text-center mb-6">
          <i className="fas fa-play-circle text-4xl text-primary mb-4"></i>
          <h3 className="text-lg font-medium text-neutral-800 mb-2">APA Citation Basics</h3>
          <p className="text-neutral-600 mb-4">15-minute interactive lesson</p>
          <Button className="bg-primary text-white hover:bg-primary/90">
            Start Lesson
          </Button>
        </div>

        {/* Interactive Exercise */}
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
          <h4 className="font-medium text-neutral-800 mb-3">Interactive Exercise</h4>
          <div className="bg-white rounded border p-4 mb-4">
            <p className="text-sm text-neutral-600 mb-2">Create an APA citation for this source:</p>
            <div className="bg-neutral-50 p-3 rounded text-sm text-neutral-700">
              Author: Smith, John<br />
              Title: Climate Change and Agriculture<br />
              Journal: Environmental Science Review<br />
              Year: 2023<br />
              Volume: 45, Pages: 123-145
            </div>
          </div>
          <Textarea
            placeholder="Type your APA citation here..."
            value={citationAnswer}
            onChange={(e) => setCitationAnswer(e.target.value)}
            className="h-20 text-sm resize-none mb-3"
          />
          
          {showHint && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
              <p className="text-sm text-blue-800">
                <strong>Hint:</strong> Remember the APA format: Author, A. A. (Year). Title of article. 
                <em>Title of Journal</em>, <em>Volume</em>(Issue), pages.
              </p>
            </div>
          )}
          
          {answerResult && (
            <div className={`rounded-lg p-4 mb-3 ${
              answerResult.isCorrect
                ? "bg-green-50 border border-green-200"
                : "bg-amber-50 border border-amber-200"
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <i className={`fas ${answerResult.isCorrect ? "fa-check-circle text-green-600" : "fa-info-circle text-amber-600"}`}></i>
                <span className={`font-medium ${answerResult.isCorrect ? "text-green-800" : "text-amber-800"}`}>
                  Score: {answerResult.score}%
                </span>
              </div>
              <p className="text-sm text-neutral-700 mb-2">{answerResult.feedback}</p>
              {answerResult.praise && (
                <p className="text-sm text-green-700 mb-2">
                  <i className="fas fa-star mr-1"></i> {answerResult.praise}
                </p>
              )}
              {answerResult.corrections.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-amber-800 mb-1">Suggestions:</p>
                  <ul className="text-xs text-amber-700 list-disc list-inside">
                    {answerResult.corrections.map((correction, idx) => (
                      <li key={idx}>{correction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Button
              onClick={handleCheckAnswer}
              disabled={isChecking || !citationAnswer.trim()}
              className="bg-accent text-white hover:bg-accent/90"
            >
              {isChecking ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Checking...
                </>
              ) : (
                "Check Answer"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowHint(!showHint)}
              className="text-primary hover:underline"
            >
              {showHint ? "Hide Hint" : "Show Hint"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
