import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

export default function LessonContent({ module, activeModule }: LessonContentProps) {
  const [citationAnswer, setCitationAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);

  const currentLesson = module.lessons[0]; // For demo, show first lesson

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
          
          <div className="flex items-center space-x-3">
            <Button className="bg-accent text-white hover:bg-accent/90">
              Check Answer
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
