import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github.css'; // You can change this to other themes
import 'katex/dist/katex.min.css'; // KaTeX CSS for math rendering
import '../styles/katex-dark.css'; // Custom dark theme for KaTeX
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
  const [streaming, setStreaming] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [aiStatus, setAiStatus] = useState<'unknown' | 'connected' | 'error'>(
    'unknown'
  );

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
    setStreaming(true);
    setAnalysis('');
    setThinkingContent('');

    try {
      let fullAnalysis = '';
      let textExtracted = true;

      for await (const chunk of aiService.streamAnalyzePage(
        filename,
        currentPage
      )) {
        if (chunk.error) {
          throw new Error(chunk.error);
        }

        if (chunk.content) {
          fullAnalysis += chunk.content;
          // Update the analysis in real-time as we receive chunks
          const { mainContent, thinking } = parseAnalysisContent(fullAnalysis);
          setAnalysis(mainContent);
          setThinkingContent(thinking);
        }

        if (chunk.text_extracted !== undefined) {
          textExtracted = chunk.text_extracted;
        }

        if (chunk.done) {
          break;
        }
      }

      if (!textExtracted) {
        setAnalysis(
          prev =>
            prev +
            '\n\n💡 Tip: This page might contain images, diagrams, or special formatting that requires visual analysis.'
        );
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis(
        'Failed to analyze page. Please check if the AI service is running and try again.'
      );
      setThinkingContent('');
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const getStatusIndicator = () => {
    switch (aiStatus) {
      case 'connected':
        return <span className="text-green-400 text-sm">● AI Connected</span>;
      case 'error':
        return <span className="text-red-400 text-sm">● AI Offline</span>;
      default:
        return <span className="text-gray-400 text-sm">● Checking...</span>;
    }
  };

  const markdownComponents = {
    code: ({ className, children, ...props }) => {
      return (
        <code
          className={`${className} bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-xs font-mono`}
          {...props}
        >
          {children}
        </code>
      );
    },
    // Custom styling for math elements to work with dark theme
    span: ({ className, children, ...props }) => {
      if (className?.includes('katex')) {
        return (
          <span className={`${className} text-gray-200`} {...props}>
            {children}
          </span>
        );
      }
      return (
        <span className={className} {...props}>
          {children}
        </span>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-gray-700 text-gray-200 p-3 rounded-md overflow-x-auto text-xs border border-gray-600">
        {children}
      </pre>
    ),
    h1: ({ children }) => (
      <h1 className="text-lg font-bold text-gray-100 mt-4 mb-2 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-bold text-gray-100 mt-3 mb-2 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-bold text-gray-100 mt-2 mb-1 first:mt-0">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-gray-300 leading-relaxed mb-2">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="text-sm text-gray-300 mb-2 pl-4 space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="text-sm text-gray-300 mb-2 pl-4 space-y-1">{children}</ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-900/30 text-sm text-gray-300 italic">
        {children}
      </blockquote>
    ),
  } as Components;

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-100">AI Analysis</h2>
          {getStatusIndicator()}
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={e => setAutoAnalyze(e.target.checked)}
              className="mr-2 bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            Auto-analyze pages
          </label>
          <button
            onClick={analyzeCurrentPage}
            disabled={loading || streaming || !filename || aiStatus === 'error'}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-600 disabled:cursor-not-allowed text-sm hover:bg-green-500 transition-colors"
          >
            {loading || streaming ? 'Analyzing...' : 'Analyze Page'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!filename ? (
          <div className="text-gray-400 text-center mt-8">
            Open a PDF to get AI insights
          </div>
        ) : aiStatus === 'error' ? (
          <div className="text-center mt-8">
            <div className="text-red-400 mb-2">AI service is not available</div>
            <div className="text-sm text-gray-400 mb-4">
              Make sure Ollama is running with qwen3-30b model at
              localhost:11434
            </div>
            <button
              onClick={checkAIConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Streaming indicator */}
            {streaming && (
              <div className="flex items-center space-x-2 text-sm text-blue-400 bg-blue-900/30 p-2 rounded">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
                <span>AI is analyzing...</span>
              </div>
            )}

            {/* Main Analysis */}
            <div className="prose prose-sm prose-gray max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeHighlight, rehypeKatex]}
                components={markdownComponents}
              >
                {analysis}
              </ReactMarkdown>
            </div>

            {/* Thinking Panel */}
            {thinkingContent && (
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center justify-between w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm font-medium text-gray-200 transition-colors"
                >
                  <span className="flex items-center">
                    🧠 AI Thinking Process
                    <span className="ml-2 text-xs text-gray-400">
                      ({thinkingContent.length} chars)
                    </span>
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showThinking ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showThinking && (
                  <div className="mt-3 p-3 bg-gray-800 rounded-md border border-gray-700">
                    <div className="prose prose-sm prose-gray max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeHighlight, rehypeKatex]}
                        components={{
                          ...markdownComponents,
                          p: ({ children }) => (
                            <p className="text-xs text-gray-400 leading-relaxed mb-2">
                              {children}
                            </p>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-sm font-bold text-gray-300 mt-3 mb-2 first:mt-0">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xs font-bold text-gray-300 mt-2 mb-1 first:mt-0">
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
          <div className="text-gray-400 text-center mt-8">
            {autoAnalyze
              ? 'Auto-analysis enabled. Change pages to see insights.'
              : 'Click "Analyze Page" to get AI insights about the current page'}
          </div>
        )}
      </div>
    </div>
  );
}
