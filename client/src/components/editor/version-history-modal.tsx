import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  title: string;
  wordCount: number;
  versionNumber: number;
  changeDescription: string | null;
  createdAt: Date;
}

interface VersionHistoryModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionHistoryModal({ documentId, isOpen, onClose }: VersionHistoryModalProps) {
  const { toast } = useToast();
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const { data: versions, isLoading } = useQuery<DocumentVersion[]>({
    queryKey: [`/api/documents/${documentId}/versions`],
    enabled: isOpen && !!documentId,
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await fetch(`/api/documents/versions/${versionId}/restore`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to restore version');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      toast({
        title: "Version Restored",
        description: "Document has been restored to the selected version.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRestore = (versionId: string) => {
    if (confirm("Are you sure you want to restore this version? This will replace your current document content.")) {
      restoreVersionMutation.mutate(versionId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View and restore previous versions of your document
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Version List */}
          <div className="w-1/3 border-r border-neutral-200 pr-4 overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-neutral-500 py-8">Loading versions...</div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedVersion?.id === version.id
                        ? 'border-accent bg-accent/10'
                        : 'border-neutral-200 hover:border-accent/50 hover:bg-neutral-50'
                    }`}
                    onClick={() => setSelectedVersion(version)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-xs">
                        v{version.versionNumber}
                      </Badge>
                      <span className="text-xs text-neutral-500">
                        {formatDate(version.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-neutral-800 truncate">
                      {version.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500">
                        {version.wordCount} words
                      </span>
                      {version.changeDescription && (
                        <>
                          <span className="text-xs text-neutral-300">•</span>
                          <span className="text-xs text-neutral-500 truncate">
                            {version.changeDescription}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-neutral-500 py-8">
                No version history available yet.
                <div className="text-xs mt-2">
                  Versions are created automatically when you make changes.
                </div>
              </div>
            )}
          </div>

          {/* Version Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedVersion ? (
              <>
                <div className="mb-4 pb-4 border-b border-neutral-200">
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                    {selectedVersion.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-neutral-600">
                    <span>Version {selectedVersion.versionNumber}</span>
                    <span>•</span>
                    <span>{selectedVersion.wordCount} words</span>
                    <span>•</span>
                    <span>{formatDate(selectedVersion.createdAt)}</span>
                  </div>
                  {selectedVersion.changeDescription && (
                    <div className="mt-2 text-sm text-neutral-500">
                      Change: {selectedVersion.changeDescription}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto bg-neutral-50 rounded-lg p-4 mb-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-neutral-800">
                      {selectedVersion.content}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRestore(selectedVersion.id)}
                    disabled={restoreVersionMutation.isPending}
                  >
                    {restoreVersionMutation.isPending ? 'Restoring...' : 'Restore This Version'}
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-400">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
