import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // You can change this to other themes
import type { Components } from 'react-markdown';
import { aiService } from '../services/api';

interface AIPanelProps {
  filename?: string;
  currentPage: number;
}

export default function AIPanel({ filename, currentPage }: AIPanelProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [thinkingContent, setThinkingContent] = useState<string>('');
  const [showThinking, setShowThinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [aiStatus, setAiStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  // Check AI connection on mount
  useEffect(() => {
    checkAIConnection();
  }, []);

  // Auto-analyze when page changes (if enabled)
  useEffect(() => {
    if (autoAnalyze && filename && currentPage) {
      analyzeCurrentPage();
    }
  }, [filename, currentPage, autoAnalyze]);

  const parseAnalysisContent = (content: string) => {
    // Extract thinking content
    const thinkingRegex = /<think>([\s\S]*?)<\/think>/g;
    const thinkingMatches = content.match(thinkingRegex);

    let thinking = '';
    if (thinkingMatches) {
      thinking = thinkingMatches
        .map(match => match.replace(/<\/?think>/g, ''))
        .join('\n\n---\n\n');
    }

    // Remove thinking tags from main content
    const mainContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    return { mainContent, thinking };
  };

  const checkAIConnection = async () => {
    try {
      await aiService.checkHealth();
      setAiStatus('connected');
    } catch (error) {
      console.error('AI connection failed:', error);
      setAiStatus('error');
    }
  };

  const analyzeCurrentPage = async () => {
    if (!filename) return;

    setLoading(true);
    try {
      const result = await aiService.analyzePage(filename, currentPage);

      const { mainContent, thinking } = parseAnalysisContent(result.analysis);
      setAnalysis(mainContent);
      setThinkingContent(thinking);

      if (!result.text_extracted) {
        setAnalysis(mainContent + '\n\n💡 Tip: This page might contain images, diagrams, or special formatting that requires visual analysis.');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis('Failed to analyze page. Please check if the AI service is running and try again.');
      setThinkingContent('');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIndicator = () => {
    switch (aiStatus) {
      case 'connected':
        return <span className="text-green-600 text-sm">● AI Connected</span>;
      case 'error':
        return <span className="text-red-600 text-sm">● AI Offline</span>;
      default:
        return <span className="text-gray-600 text-sm">● Checking...</span>;
    }
  };

  const markdownComponents = {
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return (
        <code className={`${className} bg-gray-100 px-1 py-0.5 rounded text-xs font-mono`} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs border">
        {children}
      </pre>
    ),
    h1: ({ children }) => (
      <h1 className="text-lg font-bold text-gray-900 mt-4 mb-2 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-bold text-gray-900 mt-3 mb-2 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-bold text-gray-900 mt-2 mb-1 first:mt-0">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-gray-800 leading-relaxed mb-2">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="text-sm text-gray-800 mb-2 pl-4 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="text-sm text-gray-800 mb-2 pl-4 space-y-1">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50 text-sm text-gray-700 italic">
        {children}
      </blockquote>
    ),
  } as Components;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">AI Analysis</h2>
          {getStatusIndicator()}
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(e) => setAutoAnalyze(e.target.checked)}
              className="mr-2"
            />
            Auto-analyze pages
          </label>
          <button
            onClick={analyzeCurrentPage}
            disabled={loading || !filename || aiStatus === 'error'}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Analyzing...' : 'Analyze Page'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!filename ? (
          <div className="text-gray-500 text-center mt-8">
            Open a PDF to get AI insights
          </div>
        ) : aiStatus === 'error' ? (
          <div className="text-center mt-8">
            <div className="text-red-600 mb-2">AI service is not available</div>
            <div className="text-sm text-gray-500 mb-4">
              Make sure Ollama is running with qwen3-30b model at localhost:11434
            </div>
            <button
              onClick={checkAIConnection}
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Main Analysis */}
            <div className="prose prose-sm prose-gray max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={markdownComponents}
              >
                {analysis}
              </ReactMarkdown>
            </div>

            {/* Thinking Panel */}
            {thinkingContent && (
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm font-medium text-gray-700 transition-colors"
                >
                  <span className="flex items-center">
                    🧠 AI Thinking Process
                    <span className="ml-2 text-xs text-gray-500">
                      ({thinkingContent.length} chars)
                    </span>
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showThinking ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showThinking && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                    <div className="prose prose-sm prose-gray max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          ...markdownComponents,
                          p: ({ children }) => (
                            <p className="text-xs text-gray-600 leading-relaxed mb-2">
                              {children}
                            </p>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-sm font-bold text-gray-700 mt-3 mb-2 first:mt-0">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xs font-bold text-gray-700 mt-2 mb-1 first:mt-0">
                              {children}
                            </h2>
                          ),
                        }}
                      >
                        {thinkingContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-center mt-8">
            {autoAnalyze
              ? 'Auto-analysis enabled. Change pages to see insights.'
              : 'Click "Analyze Page" to get AI insights about the current page'
            }
          </div>
        )}
      </div>
    </div>
  );
}