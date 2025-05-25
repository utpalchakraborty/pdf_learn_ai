export interface ReadingProgress {
  last_page: number;
  total_pages: number;
  progress_percentage: number;
  last_updated: string;
}

export interface PDF {
  filename: string;
  title: string;
  author: string;
  num_pages: number;
  file_size: number;
  modified_date: string;
  created_date: string;
  reading_progress?: ReadingProgress | null;
  error?: string;
}

export interface PDFInfo extends PDF {
  subject?: string;
  creator?: string;
  producer?: string;
  creation_date?: string;
  modification_date?: string;
}