import sqlite3
import os
from datetime import datetime
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self, db_path: str = "data/reading_progress.db"):
        self.db_path = db_path
        self._ensure_data_dir()
        self._init_database()
    
    def _ensure_data_dir(self):
        """Ensure the data directory exists"""
        data_dir = os.path.dirname(self.db_path)
        if data_dir and not os.path.exists(data_dir):
            os.makedirs(data_dir)
    
    def _init_database(self):
        """Initialize database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS reading_progress (
                    pdf_filename TEXT PRIMARY KEY,
                    last_page INTEGER NOT NULL,
                    total_pages INTEGER,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    
    def save_reading_progress(self, pdf_filename: str, last_page: int, total_pages: int) -> bool:
        """Save or update reading progress for a PDF"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO reading_progress 
                    (pdf_filename, last_page, total_pages, last_updated)
                    VALUES (?, ?, ?, ?)
                """, (pdf_filename, last_page, total_pages, datetime.now()))
                conn.commit()
                logger.info(f"Saved reading progress for {pdf_filename}: page {last_page}")
                return True
        except Exception as e:
            logger.error(f"Error saving reading progress: {e}")
            return False
    
    def get_reading_progress(self, pdf_filename: str) -> Optional[Dict[str, Any]]:
        """Get reading progress for a PDF"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT pdf_filename, last_page, total_pages, last_updated
                    FROM reading_progress 
                    WHERE pdf_filename = ?
                """, (pdf_filename,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        "pdf_filename": row["pdf_filename"],
                        "last_page": row["last_page"], 
                        "total_pages": row["total_pages"],
                        "last_updated": row["last_updated"]
                    }
                return None
        except Exception as e:
            logger.error(f"Error getting reading progress: {e}")
            return None
    
    def get_all_reading_progress(self) -> Dict[str, Dict[str, Any]]:
        """Get reading progress for all PDFs"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT pdf_filename, last_page, total_pages, last_updated
                    FROM reading_progress 
                    ORDER BY last_updated DESC
                """)
                
                progress = {}
                for row in cursor.fetchall():
                    progress[row["pdf_filename"]] = {
                        "last_page": row["last_page"],
                        "total_pages": row["total_pages"], 
                        "last_updated": row["last_updated"]
                    }
                return progress
        except Exception as e:
            logger.error(f"Error getting all reading progress: {e}")
            return {}

# Global instance
db_service = DatabaseService()