import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import LessonContent from "@/components/tutoring/lesson-content";
import AiTutorChat from "@/components/tutoring/ai-tutor-chat";
import ProgressSidebar from "@/components/tutoring/progress-sidebar";
import { LearningProgress, Achievement } from "@shared/schema";

type CourseModule = "research-citation" | "academic-writing" | "grammar-style" | "writing-process";

export default function TutoringView() {
  const [activeModule, setActiveModule] = useState<CourseModule>("research-citation");

  const { data: learningProgress } = useQuery<LearningProgress[]>({
    queryKey: ["/api/learning/progress"],
  });

  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ["/api/achievements"],
  });

  const moduleData = {
    "research-citation": {
      title: "Research & Citation",
      lessons: [
        { id: "apa-basics", title: "APA Citation Format", duration: 15, completed: false },
        { id: "mla-vs-apa", title: "MLA vs APA", duration: 15, completed: false },
        { id: "web-sources", title: "Citing Web Sources", duration: 20, completed: false },
      ]
    },
    "academic-writing": {
      title: "Academic Writing",
      lessons: [
        { id: "thesis-statements", title: "Thesis Statements", duration: 20, completed: false },
        { id: "paragraph-structure", title: "Paragraph Structure", duration: 18, completed: false },
        { id: "intro-conclusions", title: "Introductions & Conclusions", duration: 25, completed: false },
      ]
    },
    "grammar-style": {
      title: "Grammar & Style",
      lessons: [
        { id: "active-voice", title: "Active vs Passive Voice", duration: 12, completed: false },
        { id: "sentence-variety", title: "Sentence Variety", duration: 15, completed: false },
        { id: "conciseness", title: "Writing Concisely", duration: 18, completed: false },
      ]
    },
    "writing-process": {
      title: "Writing Process",
      lessons: [
        { id: "brainstorming", title: "Brainstorming Techniques", duration: 20, completed: false },
        { id: "outlining", title: "Creating Outlines", duration: 22, completed: false },
        { id: "revision", title: "Revision Strategies", duration: 25, completed: false },
      ]
    }
  };

  const currentModule = moduleData[activeModule];

  const calculateOverallProgress = () => {
    if (!learningProgress || learningProgress.length === 0) return 0;
    const totalProgress = learningProgress.reduce((sum: number, progress: any) => 
      sum + progress.completionPercentage, 0);
    return Math.round(totalProgress / learningProgress.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tutoring Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Writing Tutoring & Courses</h1>
            <p className="text-neutral-600 mt-2">Master academic writing with Purdue OWL integration and personalized guidance</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-neutral-600">Your Progress</p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-20 bg-neutral-200 rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full" style={{ width: `${calculateOverallProgress()}%` }}></div>
                </div>
                <span className="text-sm font-medium text-accent">{calculateOverallProgress()}%</span>
              </div>
            </div>
            <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
              Continue Learning
            </button>
          </div>
        </div>
      </div>

      {/* Course Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 mb-8">
        <div className="p-6">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-university text-white"></i>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Purdue OWL Integration</h3>
                <p className="text-sm text-neutral-600">Research & Citation • Academic Writing • Grammar</p>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex space-x-6">
                {Object.entries(moduleData).map(([moduleId, module]) => (
                  <button
                    key={moduleId}
                    onClick={() => setActiveModule(moduleId as CourseModule)}
                    className={`course-nav-btn px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeModule === moduleId ? "active" : ""
                    }`}
                  >
                    {module.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Lesson */}
        <div className="lg:col-span-2 space-y-6">
          <LessonContent
            module={currentModule}
            activeModule={activeModule}
          />
          
          <AiTutorChat />
        </div>

        {/* Sidebar */}
        <ProgressSidebar
          learningProgress={learningProgress || []}
          achievements={achievements || []}
          moduleData={moduleData}
        />
      </div>
    </div>
  );
}
