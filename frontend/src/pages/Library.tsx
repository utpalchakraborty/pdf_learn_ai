import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdfService } from '../services/api';
import type { PDF } from '../types/pdf';

export default function Library() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pdfService.listPDFs();
      setPdfs(data);
    } catch (err) {
      console.error('Error loading PDFs:', err);
      setError('Failed to load PDFs. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePDFClick = (filename: string) => {
    navigate(`/read/${encodeURIComponent(filename)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-purple-400 mx-auto"></div>
          <p className="mt-6 text-slate-300 text-lg font-medium">Loading your library...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-200 mb-3">Error Loading PDFs</h2>
          <p className="text-slate-400 mb-6 max-w-md">{error}</p>
          <button
            onClick={loadPDFs}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-purple-500/25"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
            PDF Library
          </h1>
          <p className="text-slate-300 text-lg font-medium">
            Select a PDF to start reading with AI assistance
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {pdfs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-slate-600 text-8xl mb-6">📚</div>
            <h2 className="text-2xl font-bold text-slate-300 mb-3">No PDFs Found</h2>
            <p className="text-slate-400 text-lg max-w-md mx-auto">
              Place some PDF files in the backend/pdfs directory to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {pdfs.map((pdf) => (
              <div
                key={pdf.filename}
                onClick={() => handlePDFClick(pdf.filename)}
                className="group bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer border border-slate-700/50 hover:border-purple-500/50 overflow-hidden transform hover:scale-105"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-purple-400 text-4xl group-hover:scale-110 transition-transform duration-200">📄</div>
                    <div className="text-sm text-slate-400 bg-slate-700/50 px-3 py-1 rounded-full">
                      {pdf.num_pages} pages
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-200 mb-3 line-clamp-2 overflow-hidden text-lg group-hover:text-purple-300 transition-colors duration-200" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {pdf.title}
                  </h3>

                  <p className="text-sm text-slate-400 mb-4 font-medium">
                    by {pdf.author}
                  </p>

                  <div className="text-xs text-slate-500 space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Size:</span>
                      <span className="text-slate-400">{formatFileSize(pdf.file_size)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Modified:</span>
                      <span className="text-slate-400">{formatDate(pdf.modified_date)}</span>
                    </div>
                  </div>

                  {pdf.reading_progress && (
                    <div className="mt-4 pt-3 border-t border-slate-600/50">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Reading Progress</span>
                        <span className="text-purple-400 font-medium">
                          {pdf.reading_progress.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pdf.reading_progress.progress_percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Page {pdf.reading_progress.last_page} of {pdf.reading_progress.total_pages}
                      </div>
                    </div>
                  )}

                  {pdf.error && (
                    <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                      ⚠️ {pdf.error}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-slate-700/30 border-t border-slate-600/50">
                  <div className="text-xs text-slate-400 truncate font-mono">
                    {pdf.filename}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}