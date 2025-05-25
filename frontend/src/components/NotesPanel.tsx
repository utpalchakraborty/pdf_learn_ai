import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import '../styles/katex-dark.css';
import type { Components } from 'react-markdown';
import { notesService } from '../services/api';

interface Note {
  id: number;
  pdf_filename: string;
  page_number: number;
  title: string;
  chat_content: string;
  created_at: string;
  updated_at: string;
}

interface NotesPanelProps {
  filename?: string;
  currentPage: number;
}

export default function NotesPanel({ filename, currentPage }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);

  // Load notes for the current PDF
  useEffect(() => {
    if (!filename) {
      setNotes([]);
      return;
    }

    const loadNotes = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedNotes = await notesService.getChatNotesForPdf(filename);
        setNotes(fetchedNotes);
      } catch (err) {
        console.error('Error loading notes:', err);
        setError('Failed to load notes');
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [filename]);

  const deleteNote = async (noteId: number) => {
    try {
      await notesService.deleteChatNote(noteId);
      setNotes(notes.filter(note => note.id !== noteId));
      if (expandedNote === noteId) {
        setExpandedNote(null);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      <pre className="bg-gray-700 text-gray-200 p-2 rounded-md overflow-x-auto text-xs border border-gray-600">
        {children}
      </pre>
    ),
    h1: ({ children }) => (
      <h1 className="text-sm font-bold text-gray-100 mt-3 mb-2 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-sm font-semibold text-gray-200 mt-3 mb-2 first:mt-0">
        {children}
      </h2>
    ),
    p: ({ children }) => (
      <p className="text-xs text-gray-300 leading-relaxed mb-2">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="text-gray-200 font-semibold">{children}</strong>
    ),
  } as Components;

  // Separate notes by current page and other pages
  const currentPageNotes = notes.filter(
    note => note.page_number === currentPage
  );
  const otherPageNotes = notes.filter(note => note.page_number !== currentPage);

  if (!filename) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <p className="text-gray-400 text-sm">Open a PDF to view notes</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-3 bg-gray-800">
        <h3 className="text-sm font-medium text-gray-200">
          Notes for {filename}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'} saved
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-400 text-sm">Loading notes...</div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-gray-500 text-2xl mb-2">📝</div>
              <p className="text-gray-400 text-sm">No notes saved yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Save chat conversations to create notes
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Current Page Notes */}
            {currentPageNotes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-purple-400 mb-3 uppercase tracking-wider">
                  Current Page ({currentPage})
                </h4>
                <div className="space-y-3">
                  {currentPageNotes.map(note => (
                    <div
                      key={note.id}
                      className="bg-gray-800 border border-purple-500/30 rounded-lg"
                    >
                      <div className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-200 line-clamp-2">
                            {note.title}
                          </h5>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-gray-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                            title="Delete note"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                          {formatDate(note.created_at)}
                        </p>
                        <button
                          onClick={() =>
                            setExpandedNote(
                              expandedNote === note.id ? null : note.id
                            )
                          }
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {expandedNote === note.id ? 'Hide' : 'Show'}{' '}
                          conversation
                        </button>
                        {expandedNote === note.id && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="prose prose-sm prose-gray max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeHighlight, rehypeKatex]}
                                components={markdownComponents}
                              >
                                {note.chat_content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Pages Notes */}
            {otherPageNotes.length > 0 && (
              <div>
                {currentPageNotes.length > 0 && (
                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                      Other Pages
                    </h4>
                  </div>
                )}
                <div className="space-y-3">
                  {otherPageNotes
                    .sort((a, b) => a.page_number - b.page_number)
                    .map(note => (
                      <div
                        key={note.id}
                        className="bg-gray-800 border border-gray-700 rounded-lg"
                      >
                        <div className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="text-sm font-medium text-gray-200 line-clamp-2">
                                {note.title}
                              </h5>
                              <p className="text-xs text-blue-400 mt-1">
                                Page {note.page_number}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="text-gray-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                              title="Delete note"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mb-3">
                            {formatDate(note.created_at)}
                          </p>
                          <button
                            onClick={() =>
                              setExpandedNote(
                                expandedNote === note.id ? null : note.id
                              )
                            }
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {expandedNote === note.id ? 'Hide' : 'Show'}{' '}
                            conversation
                          </button>
                          {expandedNote === note.id && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                              <div className="prose prose-sm prose-gray max-w-none">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeHighlight, rehypeKatex]}
                                  components={markdownComponents}
                                >
                                  {note.chat_content}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
