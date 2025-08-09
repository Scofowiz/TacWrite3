import { Badge } from "@/components/ui/badge";
import { LearningProgress, Achievement } from "@/types";

interface ProgressSidebarProps {
  learningProgress: LearningProgress[];
  achievements: Achievement[];
  moduleData: any;
}

export default function ProgressSidebar({
  learningProgress,
  achievements,
  moduleData
}: ProgressSidebarProps) {
  
  const calculateModuleProgress = (moduleId: string) => {
    const moduleProgress = learningProgress.filter(p => p.courseModule === moduleId);
    if (moduleProgress.length === 0) return 0;
    const totalProgress = moduleProgress.reduce((sum, p) => sum + p.completionPercentage, 0);
    return Math.round(totalProgress / moduleProgress.length);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-accent";
    if (progress >= 50) return "bg-primary";
    return "bg-neutral-300";
  };

  const nextLessons = [
    {
      title: "MLA vs APA",
      description: "Learn the differences between citation styles",
      duration: 15
    },
    {
      title: "Thesis Statements",
      description: "Crafting strong thesis statements",
      duration: 20
    },
    {
      title: "Paragraph Structure",
      description: "Building effective paragraphs",
      duration: 18
    }
  ];

  return (
    <div className="space-y-6">
      {/* Learning Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="font-semibold text-neutral-900">Learning Progress</h3>
        </div>
        <div className="p-4 space-y-4">
          {Object.entries(moduleData).map(([moduleId, module]: [string, any]) => {
            const progress = calculateModuleProgress(moduleId);
            const completed = learningProgress.filter(p => 
              p.courseModule === moduleId && p.isCompleted
            ).length;
            const total = module.lessons.length;

            return (
              <div key={moduleId}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">{module.title}</span>
                  <span className="text-sm text-neutral-600">{completed}/{total}</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getProgressColor(progress)}`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="font-semibold text-neutral-900">Recent Achievements</h3>
        </div>
        <div className="p-4 space-y-3">
          {achievements.slice(0, 3).map((achievement) => (
            <div key={achievement.id} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <i className={`${achievement.iconClass} text-white text-sm`}></i>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-800">{achievement.title}</p>
                <p className="text-xs text-neutral-600">{achievement.description}</p>
              </div>
            </div>
          ))}
          
          {achievements.length === 0 && (
            <div className="text-center py-4">
              <i className="fas fa-trophy text-2xl text-neutral-300 mb-2"></i>
              <p className="text-sm text-neutral-500">No achievements yet</p>
              <p className="text-xs text-neutral-400">Complete lessons to earn badges</p>
            </div>
          )}
        </div>
      </div>

      {/* Next Lessons */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="font-semibold text-neutral-900">Up Next</h3>
        </div>
        <div className="p-4 space-y-3">
          {nextLessons.map((lesson, index) => (
            <div
              key={index}
              className="border border-neutral-200 rounded-lg p-3 hover:border-primary/50 cursor-pointer transition-colors"
            >
              <h4 className="text-sm font-medium text-neutral-800">{lesson.title}</h4>
              <p className="text-xs text-neutral-600 mt-1">{lesson.description}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-neutral-500">{lesson.duration} min</span>
                <i className="fas fa-arrow-right text-primary text-xs"></i>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
