This is a study assitant that allows study of a pdf file along with an AI.

When reading a pdf document instead of opening it up in a pdf viewer I will to open it up in my own program/web page. The layout is attached. 

![Layout](layout.webp)


On the left pane I can read the pdf just like a normal pdf document. On the right pane, an AI is processing the page I am reading along with some more context and provides helpful hints to understand things. Bottom of the right pane is a chat panel where I can ask questions and the AI answers in the AI pane.

We can assume the program is connected with a background ollama model running. I can run the ollama model using ollama. So the program just needs to communicate with that for AI functionality. 

the pdfs are available in a local directory underneath the react app. 

## Recommended Architecture:

### **Frontend: React + TypeScript**
- **PDF Rendering**: Use `react-pdf` (wrapper around PDF.js) - battle-tested, handles research papers well
- **UI Framework**: Tailwind CSS or shadcn/ui for quick, modern styling
- **State Management**: React Context or Zustand for managing current page, chat history
- **Layout**: CSS Grid or Flexbox for the three-pane layout
- **Pages**:
  1. **Home/Library**: Grid view of available PDFs
  2. **Reader**: The three-pane layout for reading

### **Backend: Python FastAPI**
- **Why Python**: Better PDF text extraction libraries (PyPDF2, pdfplumber)
- **Ollama Integration**: Simple HTTP requests to Ollama's REST API
- **Endpoints**:
  - `GET /pdfs` - List all PDFs in the local directory
  - `GET /pdf/{filename}/page/{page_num}` - Get rendered page
  - `GET /pdf/{filename}/text/{page_num}` - Get text for AI context
  - `POST /ai/analyze` - Analyze current page with context
  - `POST /ai/chat` - Chat with AI about current content

## High-Level Architecture:

```
┌────────────────────────────────────────────────────────┐
│                   React Frontend                       │
├─────────────────┬────────────────┬─────────────────────┤
│   PDF Viewer    │   AI Panel     │   Chat Interface    │
│  (react-pdf)    │ (Analysis View)│  (Message History)  │
└────────┬────────┴───────┬────────┴──────────┬──────────┘
         │                │                    │
         └────────────────┴────────────────────┘
                          │
                    FastAPI Backend
                          │
         ┌────────────────┴────────────────┐
         │                                 │
    PDF Processing                   Ollama Client
    (Text Extraction)                (HTTP Requests)
                                          │
                                    Ollama Server
                                    (Running locally)
```

## Key Design Decisions:

1. **Stateless Page Analysis**: Each page change triggers a new analysis with context (current ± 1 page)
2. **Streaming AI Responses**: Use Server-Sent Events (SSE) for streaming Ollama responses
3. **Lazy PDF Loading**: Load pages on demand rather than entire PDF
4. **WebSocket for Chat**: Real-time communication for the chat interface

Would you like me to create a detailed implementation plan with specific libraries and code structure? I can also start with a basic proof-of-concept focusing on the core functionality.

## Simplified Architecture:

```
project/
├── frontend/               # React app
├── backend/               # FastAPI
│   └── pdfs/             # Local PDF directory
└── ollama/               # Running separately
```

## Quick Implementation Approach:

1. **Start Simple**: 
   - Basic PDF display
   - Manual "Analyze Page" button (before auto-analysis)
   - Simple chat

2. **Then Add**:
   - Auto-analysis on page change
   - Streaming responses
   - Better UI/UX

This approach lets you have a working prototype in a few hours instead of days. Should we start with:
- A basic project structure and dependencies?
- Or jump straight to a minimal working prototype?

## Updated Step-by-Step Implementation Plan (with Vite)

### Phase 1: Project Setup and Basic Structure

#### Step 1.1: Initialize Project Structure
```
pdf-learn-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   └── main.py
│   ├── pdfs/          # Drop PDFs here
│   └── requirements.txt
├── .gitignore
└── README.md
```

#### Step 1.2: Backend Setup
1. Create Python virtual environment:
   ```bash
   cd backend
   # create environment using uv
   ```

2. Create `requirements.txt`:
   ```
   fastapi==0.109.0
   uvicorn[standard]==0.25.0
   python-multipart==0.0.6
   PyPDF2==3.0.1
   pdfplumber==0.10.3
   pillow==10.2.0
   httpx==0.26.0
   python-dotenv==1.0.0
   cors==1.0.1
   ```

3. Create basic FastAPI app structure:
   ```python
   # backend/app/main.py
   from fastapi import FastAPI
   from fastapi.middleware.cors import CORSMiddleware
   
   app = FastAPI()
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],  # Vite default port
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   
   @app.get("/")
   def read_root():
       return {"message": "PDF AI Reader API"}
   ```

#### Step 1.3: Frontend Setup with Vite
1. Create Vite React TypeScript app:
   ```bash
   npm create vite@latest frontend -- --template react-ts
   cd frontend
   npm install
   ```

2. Install core dependencies:
   ```bash
   npm install react-pdf axios react-router-dom
   npm install -D @types/react-pdf tailwindcss postcss autoprefixer
   ```

3. Configure Tailwind CSS:
   ```bash
   npx tailwindcss init -p
   ```
   
   Update `tailwind.config.js`:
   ```javascript
   export default {
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```

4. Update `src/index.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

5. Configure Vite for API proxy:
   ```typescript
   // vite.config.ts
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   
   export default defineConfig({
     plugins: [react()],
     server: {
       proxy: {
         '/api': {
           target: 'http://localhost:8000',
           changeOrigin: true,
           rewrite: (path) => path.replace(/^\/api/, '')
         }
       }
     }
   })
   ```

### Phase 2: PDF Library and Display

#### Step 2.1: Backend PDF Service
1. Create PDF router:
   ```python
   # backend/app/routers/pdf.py
   from fastapi import APIRouter, HTTPException
   from pathlib import Path
   import os
   
   router = APIRouter(prefix="/pdf", tags=["pdf"])
   
   PDF_DIR = Path("pdfs")
   
   @router.get("/list")
   async def list_pdfs():
       # List all PDFs in the directory
       pass
   
   @router.get("/{filename}/info")
   async def get_pdf_info(filename: str):
       # Return PDF metadata
       pass
   
   @router.get("/{filename}/text/{page_num}")
   async def get_page_text(filename: str, page_num: int):
       # Extract text from specific page
       pass
   ```

2. Create PDF service:
   ```python
   # backend/app/services/pdf_service.py
   import pdfplumber
   from PyPDF2 import PdfReader
   
   class PDFService:
       def __init__(self, pdf_dir: Path):
           self.pdf_dir = pdf_dir
       
       def extract_text(self, filename: str, page_num: int):
           # Implementation
           pass
   ```

#### Step 2.2: Frontend Library Page
1. Set up React Router:
   ```typescript
   // src/main.tsx
   import React from 'react'
   import ReactDOM from 'react-dom/client'
   import { BrowserRouter } from 'react-router-dom'
   import App from './App'
   import './index.css'
   
   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <BrowserRouter>
         <App />
       </BrowserRouter>
     </React.StrictMode>,
   )
   ```

2. Create routing structure:
   ```typescript
   // src/App.tsx
   import { Routes, Route } from 'react-router-dom'
   import Library from './pages/Library'
   import Reader from './pages/Reader'
   
   function App() {
     return (
       <Routes>
         <Route path="/" element={<Library />} />
         <Route path="/read/:filename" element={<Reader />} />
       </Routes>
     )
   }
   ```

3. Create API service:
   ```typescript
   // src/services/api.ts
   import axios from 'axios'
   
   const api = axios.create({
     baseURL: '/api'
   })
   
   export const pdfService = {
     listPDFs: () => api.get('/pdf/list'),
     getPDFInfo: (filename: string) => api.get(`/pdf/${filename}/info`),
     getPageText: (filename: string, pageNum: number) => 
       api.get(`/pdf/${filename}/text/${pageNum}`)
   }
   ```

### Phase 3: Three-Pane Layout

#### Step 3.1: Reader Component Structure
```typescript
// src/pages/Reader.tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import PDFViewer from '../components/PDFViewer'
import AIPanel from '../components/AIPanel'
import ChatInterface from '../components/ChatInterface'

export default function Reader() {
  const { filename } = useParams()
  const [currentPage, setCurrentPage] = useState(1)
  
  return (
    <div className="h-screen flex">
      <div className="w-1/2 border-r">
        <PDFViewer 
          filename={filename}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
      <div className="w-1/2 flex flex-col">
        <div className="flex-1 overflow-auto">
          <AIPanel 
            filename={filename}
            currentPage={currentPage}
          />
        </div>
        <div className="border-t">
          <ChatInterface 
            filename={filename}
            currentPage={currentPage}
          />
        </div>
      </div>
    </div>
  )
}
```

### Phase 4: Ollama Integration

#### Step 4.1: Backend Ollama Client
1. Create Ollama service:
   ```python
   # backend/app/services/ollama_service.py
   import httpx
   import json
   from typing import AsyncGenerator
   
   class OllamaService:
       def __init__(self, base_url: str = "http://localhost:11434"):
           self.base_url = base_url
           self.model = "llama2"  # or your preferred model
       
       async def analyze_page(self, text: str, context: str) -> str:
           # Implementation
           pass
       
       async def chat_stream(self, message: str, context: str) -> AsyncGenerator:
           # Stream implementation
           pass
   ```

2. Create AI router:
   ```python
   # backend/app/routers/ai.py
   from fastapi import APIRouter, HTTPException
   from fastapi.responses import StreamingResponse
   
   router = APIRouter(prefix="/ai", tags=["ai"])
   
   @router.post("/analyze")
   async def analyze_page(request: AnalyzeRequest):
       # Analyze current page
       pass
   
   @router.post("/chat")
   async def chat(request: ChatRequest):
       # Handle chat with streaming
       pass
   ```

### Phase 5: Frontend AI Integration

#### Step 5.1: AI Panel Component
```typescript
// src/components/AIPanel.tsx
import { useState, useEffect } from 'react'
import { aiService } from '../services/api'

export default function AIPanel({ filename, currentPage }) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  
  const analyzeCurrentPage = async () => {
    setLoading(true)
    try {
      const response = await aiService.analyzePage(filename, currentPage)
      setAnalysis(response.data.analysis)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">AI Analysis</h2>
        <button 
          onClick={analyzeCurrentPage}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {loading ? 'Analyzing...' : 'Analyze Page'}
        </button>
      </div>
      <div className="prose">
        {analysis || 'Click "Analyze Page" to get AI insights'}
      </div>
    </div>
  )
}
```

### Phase 6: Development Scripts

#### Package.json Scripts
```json
// frontend/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

#### Backend Run Script
```bash
# backend/run.sh
#!/bin/bash
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Phase 7: Initial Git Setup

#### .gitignore
```
# Backend
backend/venv/
backend/__pycache__/
backend/*.pyc
backend/.env
backend/pdfs/*
!backend/pdfs/.gitkeep

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.env

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

## Quick Start Commands

After creating the GitHub repo:

```bash
# Clone and setup
git clone <your-repo-url>
cd pdf-learn-ai

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
mkdir pdfs
echo "Place your PDFs here" > pdfs/.gitkeep

# Frontend setup
cd ../frontend
npm install

# Run both (in separate terminals)
# Terminal 1 (Backend):
cd backend && uvicorn app.main:app --reload

# Terminal 2 (Frontend):
cd frontend && npm run dev
```

