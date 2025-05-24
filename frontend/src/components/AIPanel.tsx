import { useState } from 'react';

interface AIPanelProps {
  filename?: string;
  currentPage: number;
}

export default function AIPanel({ filename, currentPage }: AIPanelProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const analyzeCurrentPage = async () => {
    if (!filename) return;
    
    setLoading(true);
    try {
      // TODO: Implement AI analysis API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setAnalysis(`Analysis for page ${currentPage} of ${filename}:\n\nThis is a placeholder for AI-generated insights about the current page content. The AI will analyze the text and provide helpful explanations, summaries, and context.`);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis('Failed to analyze page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Analysis</h2>
        <button
          onClick={analyzeCurrentPage}
          disabled={loading || !filename}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Page'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!filename ? (
          <div className="text-gray-500 text-center mt-8">
            Open a PDF to get AI insights
          </div>
        ) : analysis ? (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {analysis}
            </pre>
          </div>
        ) : (
          <div className="text-gray-500 text-center mt-8">
            Click "Analyze Page" to get AI insights about the current page
          </div>
        )}
      </div>
    </div>
  );
}