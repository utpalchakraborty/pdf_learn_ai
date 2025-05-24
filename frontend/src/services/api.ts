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

  // Future endpoints
  getPageText: async (filename: string, pageNum: number): Promise<string> => {
    const response = await api.get(`/pdf/${filename}/text/${pageNum}`);
    return response.data;
  }
};

export default api;