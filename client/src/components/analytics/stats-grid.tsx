interface StatsGridProps {
  stats: {
    totalDocuments: number;
    totalWords: number;
    totalInteractions: number;
    avgQualityScore: number;
  };
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const statItems = [
    {
      label: "Documents",
      value: stats.totalDocuments,
      icon: "fas fa-file-alt",
      color: "bg-primary/10 text-primary"
    },
    {
      label: "Words Written",
      value: stats.totalWords.toLocaleString(),
      icon: "fas fa-edit",
      color: "bg-accent/10 text-accent"
    },
    {
      label: "AI Assists",
      value: stats.totalInteractions,
      icon: "fas fa-robot",
      color: "bg-secondary/10 text-secondary"
    },
    {
      label: "Avg Quality Score",
      value: stats.avgQualityScore.toFixed(1),
      icon: "fas fa-chart-line",
      color: "bg-orange-500/10 text-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {statItems.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center">
            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
              <i className={`${stat.icon} text-xl`}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm text-neutral-600">{stat.label}</p>
              <p className="text-2xl font-semibold text-neutral-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
