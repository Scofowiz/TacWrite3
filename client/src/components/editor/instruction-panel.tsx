import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Document } from "@/types";

interface InstructionPanelProps {
  document?: Document;
}

export default function InstructionPanel({ document }: InstructionPanelProps) {
  const [context, setContext] = useState(
    document?.context?.description || 
    "Academic research paper for environmental science course. Target audience: undergraduate students and professors. Formal tone with clear evidence-based arguments."
  );
  const [currentGoal, setCurrentGoal] = useState("improve-clarity");

  if (!document) {
    return (
      <div className="w-80 bg-white border-l border-neutral-200 flex flex-col">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-800">Writing Instructions & Context</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">Select a document to view instructions</p>
        </div>
      </div>
    );
  }

  const feedbackItems = [
    {
      type: "success",
      icon: "fas fa-check",
      color: "bg-accent",
      message: "Strong introduction with clear thesis statement"
    },
    {
      type: "warning",
      icon: "fas fa-exclamation",
      color: "bg-yellow-500",
      message: "Consider adding more statistical data to support claims"
    },
    {
      type: "info",
      icon: "fas fa-lightbulb",
      color: "bg-primary",
      message: "Excellent use of transitional phrases between paragraphs"
    }
  ];

  return (
    <div className="w-80 bg-white border-l border-neutral-200 flex flex-col">
      <div className="p-4 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-800">Writing Instructions & Context</h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
        {/* Context Input */}
        <div>
          <Label className="text-sm font-medium text-neutral-700 block mb-2">
            Document Context
          </Label>
          <Textarea
            placeholder="Provide context about your writing goals, target audience, tone, etc."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="h-24 text-sm resize-none"
          />
        </div>

        {/* Writing Goals */}
        <div>
          <Label className="text-sm font-medium text-neutral-700 block mb-2">
            Current Goal
          </Label>
          <Select value={currentGoal} onValueChange={setCurrentGoal}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="improve-clarity">Improve clarity and flow</SelectItem>
              <SelectItem value="add-evidence">Add supporting evidence</SelectItem>
              <SelectItem value="enhance-description">Enhance descriptive language</SelectItem>
              <SelectItem value="strengthen-conclusion">Strengthen conclusion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Real-time Feedback */}
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-neutral-800 mb-2">Real-time Feedback</h4>
          <div className="space-y-2">
            {feedbackItems.map((item, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className={`w-4 h-4 ${item.color} rounded-full flex items-center justify-center mt-0.5`}>
                  <i className={`${item.icon} text-white text-xs`}></i>
                </div>
                <p className="text-sm text-neutral-600">{item.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Writing Statistics */}
        <div className="border border-neutral-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-neutral-800 mb-3">Writing Statistics</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Words:</span>
              <span className="font-medium">{document.wordCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Reading Level:</span>
              <span className="font-medium">College</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Readability Score:</span>
              <span className="font-medium text-accent">82/100</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Grammar Issues:</span>
              <span className="font-medium text-red-600">3</span>
            </div>
          </div>
        </div>

        {/* AI Agent Status */}
        <div className="border border-neutral-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-neutral-800 mb-3">AI Agent Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-accent rounded-full"></div>
                <span className="text-sm text-neutral-600">Writing Assistant</span>
              </div>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-neutral-300 rounded-full"></div>
                <span className="text-sm text-neutral-600">Auto-Writer</span>
              </div>
              <Badge variant="outline" className="text-xs">Premium</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-neutral-300 rounded-full"></div>
                <span className="text-sm text-neutral-600">Market Insights</span>
              </div>
              <Badge variant="outline" className="text-xs">Premium</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
