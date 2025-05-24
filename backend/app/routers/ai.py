from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json

from ..services.ollama_service import OllamaService
from ..services.pdf_service import PDFService

router = APIRouter(prefix="/ai", tags=["ai"])

# Initialize services
ollama_service = OllamaService()
pdf_service = PDFService()

class AnalyzePageRequest(BaseModel):
    filename: str
    page_num: int
    context: Optional[str] = ""

class ChatRequest(BaseModel):
    message: str
    filename: str
    page_num: int
    chat_history: Optional[List[Dict[str, str]]] = None

@router.get("/health")
async def health_check():
    """
    Check if AI service is working
    """
    try:
        result = await ollama_service.test_connection()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.post("/analyze")
async def analyze_page(request: AnalyzePageRequest) -> Dict[str, Any]:
    """
    Analyze a specific page of a PDF using AI
    """
    try:
        # Extract text from the PDF page
        page_text = pdf_service.extract_page_text(request.filename, request.page_num)
        
        if not page_text.strip():
            return {
                "filename": request.filename,
                "page_number": request.page_num,
                "analysis": "This page appears to be empty or contains no extractable text. It might contain only images, diagrams, or formatted elements that couldn't be processed.",
                "text_extracted": False
            }
        
        # Get AI analysis
        analysis = await ollama_service.analyze_page(
            text=page_text,
            filename=request.filename,
            page_num=request.page_num,
            context=request.context
        )
        
        return {
            "filename": request.filename,
            "page_number": request.page_num,
            "analysis": analysis,
            "text_extracted": True,
            "text_length": len(page_text)
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/analyze/stream")
async def analyze_page_stream(request: AnalyzePageRequest):
    """
    Analyze a specific page of a PDF using AI with streaming response
    """
    try:
        # Extract text from the PDF page
        page_text = pdf_service.extract_page_text(request.filename, request.page_num)
        
        if not page_text.strip():
            async def generate_empty_response():
                yield f"data: {json.dumps({'content': 'This page appears to be empty or contains no extractable text. It might contain only images, diagrams, or formatted elements that could not be processed.', 'text_extracted': False})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            
            return StreamingResponse(
                generate_empty_response(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Content-Type": "text/event-stream"
                }
            )
        
        async def generate_analysis():
            try:
                async for chunk in ollama_service.analyze_page_stream(
                    text=page_text,
                    filename=request.filename,
                    page_num=request.page_num,
                    context=request.context
                ):
                    yield f"data: {json.dumps({'content': chunk, 'text_extracted': True})}\n\n"
                
                # Send end-of-stream marker
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_analysis(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream"
            }
        )
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/chat")
async def chat_with_ai(request: ChatRequest):
    """
    Chat with AI about the PDF content with streaming response
    """
    try:
        # Extract text from current page for context
        page_text = pdf_service.extract_page_text(request.filename, request.page_num)
        
        async def generate_response():
            try:
                async for chunk in ollama_service.chat_stream(
                    message=request.message,
                    filename=request.filename,
                    page_num=request.page_num,
                    pdf_text=page_text,
                    chat_history=request.chat_history
                ):
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Send end-of-stream marker
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_response(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream"
            }
        )
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@router.get("/{filename}/context/{page_num}")
async def get_page_context(filename: str, page_num: int, context_pages: int = 1) -> Dict[str, Any]:
    """
    Get text context around a specific page (current page ± context_pages)
    This can be useful for providing broader context to AI analysis
    """
    try:
        # Get PDF info to know total pages
        pdf_info = pdf_service.get_pdf_info(filename)
        total_pages = pdf_info["num_pages"]
        
        # Calculate page range
        start_page = max(1, page_num - context_pages)
        end_page = min(total_pages, page_num + context_pages)
        
        context_text = {}
        for page in range(start_page, end_page + 1):
            try:
                text = pdf_service.extract_page_text(filename, page)
                context_text[str(page)] = text
            except Exception as e:
                context_text[str(page)] = f"Error extracting page {page}: {str(e)}"
        
        return {
            "filename": filename,
            "current_page": page_num,
            "context_range": {"start": start_page, "end": end_page},
            "total_pages": total_pages,
            "context_text": context_text
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting context: {str(e)}")