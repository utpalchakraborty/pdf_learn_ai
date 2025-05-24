export interface PDF {
  filename: string;
  title: string;
  author: string;
  num_pages: number;
  file_size: number;
  modified_date: string;
  created_date: string;
  error?: string;
}

export interface PDFInfo extends PDF {
  subject?: string;
  creator?: string;
  producer?: string;
  creation_date?: string;
  modification_date?: string;
}