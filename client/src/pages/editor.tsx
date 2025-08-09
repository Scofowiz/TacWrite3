import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DocumentSidebar from "@/components/editor/document-sidebar";
import DocumentEditor from "@/components/editor/document-editor";
import AiAssistantPanel from "@/components/editor/ai-assistant-panel";
import InstructionPanel from "@/components/editor/instruction-panel";
import PremiumUpgradeModal from "@/components/modals/premium-upgrade-modal";
import { Document } from "@shared/schema";

export default function EditorView() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [aiAssistantVisible, setAiAssistantVisible] = useState(true);

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: selectedDocument } = useQuery<Document>({
    queryKey: ["/api/documents", selectedDocumentId],
    enabled: !!selectedDocumentId,
  });

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocumentId(document.id);
  };

  const handlePremiumFeature = () => {
    setShowPremiumModal(true);
  };

  // Select first document by default
  if (documents && documents.length > 0 && !selectedDocumentId) {
    setSelectedDocumentId(documents[0].id);
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Document Sidebar */}
      <DocumentSidebar
        documents={documents || []}
        selectedDocumentId={selectedDocumentId}
        onDocumentSelect={handleDocumentSelect}
        onPremiumFeature={handlePremiumFeature}
        isLoading={documentsLoading}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        <DocumentEditor
          document={selectedDocument}
          onAiAssistantToggle={() => setAiAssistantVisible(!aiAssistantVisible)}
          aiAssistantVisible={aiAssistantVisible}
        />

        <div className="flex-1 flex">
          {/* Editor Content */}
          <div className="flex-1 relative">
            {selectedDocument ? (
              <div className="h-full p-6 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                  <div className="prose prose-lg max-w-none">
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 min-h-[600px]">
                      {/* Document Title */}
                      <div className="mb-6">
                        <input
                          type="text"
                          value={selectedDocument.title}
                          className="text-2xl font-bold w-full border-none outline-none resize-none bg-transparent"
                          placeholder="Document title..."
                        />
                      </div>

                      {/* Content with AI suggestions */}
                      <div className="space-y-4 text-neutral-800 leading-relaxed prose-editor">
                        <div
                          contentEditable
                          className="min-h-[400px] outline-none"
                          dangerouslySetInnerHTML={{ __html: selectedDocument.content }}
                          suppressContentEditableWarning={true}
                        />
                        
                        {/* Cursor indicator */}
                        <div className="cursor-indicator"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-file-alt text-4xl text-neutral-300 mb-4"></i>
                  <p className="text-neutral-500">Select a document to start writing</p>
                </div>
              </div>
            )}

            {/* Floating AI Assistant Panel */}
            {aiAssistantVisible && selectedDocument && (
              <AiAssistantPanel
                document={selectedDocument}
                onClose={() => setAiAssistantVisible(false)}
                onPremiumFeature={handlePremiumFeature}
              />
            )}
          </div>

          {/* Instruction Panel */}
          <InstructionPanel
            document={selectedDocument}
          />
        </div>
      </div>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </div>
  );
}
