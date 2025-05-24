import axios from 'axios';
import type { PDF, PDFInfo } from '../types/pdf';

const api = axios.create({
  baseURL: 'http://localhost:8000'
});

export const pdfService = {
  listPDFs: async (): Promise<PDF[]> => {
    const response = await api.get('/pdf/list');
    return response.data;
  },

  getPDFInfo: async (filename: string): Promise<PDFInfo> => {
    const response = await api.get(`/pdf/${filename}/info`);
    return response.data;
  },

  getPageText: async (filename: string, pageNum: number): Promise<string> => {
    const response = await api.get(`/pdf/${filename}/text/${pageNum}`);
    return response.data;
  }
};

export const aiService = {
  checkHealth: async () => {
    const response = await api.get('/ai/health');
    return response.data;
  },

  analyzePage: async (filename: string, pageNum: number, context?: string) => {
    const response = await api.post('/ai/analyze', {
      filename,
      page_num: pageNum,
      context: context || ""
    });
    return response.data;
  },

  getPageContext: async (filename: string, pageNum: number, contextPages: number = 1) => {
    const response = await api.get(`/ai/${filename}/context/${pageNum}?context_pages=${contextPages}`);
    return response.data;
  }
};

export const chatService = {
  streamChat: async function* (
    message: string,
    filename: string,
    pageNum: number,
    chatHistory?: Array<{role: string, content: string}>
  ): AsyncGenerator<string, void, unknown> {
    try {
      const response = await fetch('http://localhost:8000/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          filename,
          page_num: pageNum,
          chat_history: chatHistory
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  throw new Error(data.error);
                }
                if (data.done) {
                  return;
                }
                if (data.content) {
                  yield data.content;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

export default api;