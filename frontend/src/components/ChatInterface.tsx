import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css'; // KaTeX CSS for math rendering
import '../styles/katex-dark.css'; // Custom dark theme for KaTeX
import type { Components } from 'react-markdown';
import { chatService } from '../services/api';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatInterfaceProps {
  filename?: string;
  currentPage: number;
}

export default function ChatInterface({ filename, currentPage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const clearChat = () => {
    setMessages([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !filename) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setLoading(true);
    setStreaming(true);

    // Create placeholder AI message for streaming
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      text: '',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      // Convert messages to chat history format
      const chatHistory = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));

      // Stream the AI response
      const stream = chatService.streamChat(currentInput, filename, currentPage, chatHistory);

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, text: fullResponse }
            : msg
        ));
      }
    } catch (error) {
      console.error('Chat failed:', error);
      const errorText = `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure the AI service is running.`;

      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, text: errorText }
          : msg
      ));
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const markdownComponents = {
    code: ({ className, children, ...props }) => {
      return (
        <code className={`${className} bg-gray-600 text-gray-100 px-1 py-0.5 rounded text-xs font-mono`} {...props}>
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
      return <span className={className} {...props}>{children}</span>;
    },
    pre: ({ children }) => (
      <pre className="bg-gray-600 text-gray-100 p-2 rounded-md overflow-x-auto text-xs border border-gray-500">
        {children}
      </pre>
    ),
    h1: ({ children }) => (
      <h1 className="text-base font-bold text-gray-100 mt-3 mb-2 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-sm font-bold text-gray-100 mt-2 mb-1 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xs font-bold text-gray-100 mt-2 mb-1 first:mt-0">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-gray-200 leading-relaxed mb-1">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="text-sm text-gray-200 mb-1 pl-3 space-y-0.5">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="text-sm text-gray-200 mb-1 pl-3 space-y-0.5">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-blue-400 pl-2 py-0.5 bg-blue-900/20 text-sm text-gray-200 italic">
        {children}
      </blockquote>
    ),
  } as Components;

  return (
    <div className="h-full flex flex-col bg-gray-900 border-t border-gray-700">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-2 bg-gray-800 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-200">
          Chat about {filename ? `${filename} (Page ${currentPage})` : 'PDF'}
        </h3>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="px-3 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-500 transition-colors"
            title="Clear chat"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-sm text-center">
            {filename ? 'Ask questions about the PDF content...' : 'Open a PDF to start chatting'}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${message.isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-200'
                  }`}
              >
                {message.isUser ? (
                  message.text
                ) : (
                  <div className="prose prose-sm prose-gray max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeHighlight, rehypeKatex]}
                      components={markdownComponents}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {streaming && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-sm">
              <span className="inline-block animate-pulse">AI is typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={filename ? "Ask about this PDF..." : "Open a PDF to chat"}
            disabled={!filename || loading}
            className="flex-1 px-3 py-2 border border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-700 disabled:text-gray-500"
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || !filename || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}