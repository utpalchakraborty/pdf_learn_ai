from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from typing import List, Dict, Any
import os
from datetime import datetime

from ..services.pdf_service import PDFService

router = APIRouter(prefix="/pdf", tags=["pdf"])

# Initialize PDF service
pdf_service = PDFService()

@router.get("/list")
async def list_pdfs() -> List[Dict[str, Any]]:
    """
    List all PDFs in the pdfs directory with metadata
    """
    try:
        pdfs = pdf_service.list_pdfs()
        return pdfs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing PDFs: {str(e)}")

@router.get("/{filename}/info")
async def get_pdf_info(filename: str) -> Dict[str, Any]:
    """
    Get detailed information about a specific PDF
    """
    try:
        info = pdf_service.get_pdf_info(filename)
        return info
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting PDF info: {str(e)}")

@router.get("/{filename}/file")
async def get_pdf_file(filename: str):
    """
    Serve the actual PDF file for viewing
    """
    try:
        file_path = pdf_service.get_pdf_path(filename)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        return FileResponse(
            path=str(file_path),
            media_type="application/pdf",
            filename=filename
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving PDF: {str(e)}")

@router.get("/{filename}/text/{page_num}")
async def get_page_text(filename: str, page_num: int) -> Dict[str, Any]:
    """
    Extract text from a specific page of the PDF
    """
    try:
        text = pdf_service.extract_page_text(filename, page_num)
        return {
            "filename": filename,
            "page_number": page_num,
            "text": text
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")