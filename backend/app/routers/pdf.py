from fastapi import APIRouter, HTTPException
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