import { useParams, useNavigate } from 'react-router-dom';

export default function Reader() {
  const { filename } = useParams<{ filename: string }>();
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            ← Back to Library
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            {filename ? decodeURIComponent(filename) : 'PDF Reader'}
          </h1>
        </div>
      </div>
      
      <div className="flex-1 flex">
        <div className="w-1/2 border-r border-gray-200 bg-white flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">📄</div>
            <p>PDF Viewer Component</p>
            <p className="text-sm">Coming next...</p>
          </div>
        </div>
        
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 bg-white flex items-center justify-center border-b border-gray-200">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-4">🤖</div>
              <p>AI Analysis Panel</p>
              <p className="text-sm">Coming soon...</p>
            </div>
          </div>
          
          <div className="h-1/3 bg-gray-50 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-4">💬</div>
              <p>Chat Interface</p>
              <p className="text-sm">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}