import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PDFViewer from '../components/PDFViewer';
import AIPanel from '../components/AIPanel';
import ChatInterface from '../components/ChatInterface';

export default function Reader() {
  const { filename } = useParams<{ filename: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white rounded transition-colors"
          >
            ← Back to Library
          </button>
          <h1 className="text-lg font-semibold text-gray-100">
            PDF AI Reader
          </h1>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* PDF Viewer - Left Pane */}
        <div className="w-1/2 border-r border-gray-700">
          <PDFViewer
            filename={filename}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Right Pane - AI Analysis + Chat */}
        <div className="w-1/2 flex flex-col">
          {/* AI Analysis Panel - Top */}
          <div className="flex-1 border-b border-gray-700">
            <AIPanel
              filename={filename}
              currentPage={currentPage}
            />
          </div>

          {/* Chat Interface - Bottom */}
          <ChatInterface
            filename={filename}
            currentPage={currentPage}
          />
        </div>
      </div>
    </div>
  );
}