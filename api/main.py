from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import uuid
import os
import io
import datetime
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv

load_dotenv()

# Initialize Google's Gemini AI libraries
try:
    import google.genai as genai
    from google.genai import types as genai_types
except ImportError:
    print("Google Genai SDK not found. Installing...")
    import subprocess
    subprocess.check_call(["uv", "pip", "install", "google-genai"])
    import google.genai as genai
    from google.genai import types as genai_types

# Store active cache objects
active_caches = {}

# Load environment variables or config
import os
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable not set")

# Initialize Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)

# Define lifespan for FastAPI app (modern approach for startup/shutdown events)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load any persistent caches from storage if needed
    print("FastAPI application startup: Initializing Gemini client")
    yield
    # Shutdown: Clean up resources
    print("FastAPI application shutdown: Cleaning up resources")
    for cache_id in list(active_caches.keys()):
        try:
            cache = active_caches[cache_id]
            if hasattr(cache, 'name'):
                # Try to delete the cache from Gemini
                client.caches.delete(cache.name)
        except Exception as e:
            print(f"Error cleaning up cache {cache_id}: {str(e)}")
    active_caches.clear()

app = FastAPI(lifespan=lifespan)

# Add CORS middleware to allow frontend to communicate with API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class ChatMessage(BaseModel):
    content: str
    role: str = "user"  # "user" or "assistant"

class ChatRequest(BaseModel):
    cache_id: str
    message: str
    history: Optional[List[ChatMessage]] = None
    
class ChatResponse(BaseModel):
    message: str
    cache_id: str
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "message": "This is a response from the AI about the PDF content.",
                    "cache_id": "123e4567-e89b-12d3-a456-426614174000"
                }
            ]
        }
    }

@app.get("/")
def read_root():
    return {"message": "ReadAI API is running"}

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file to create a new Gemini cache for chat context
    """
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Create a BytesIO object from the file contents
        file_obj = io.BytesIO(contents)
        
        # Upload the file to Gemini
        document = client.files.upload(
            file=file_obj,
            config=dict(mime_type='application/pdf')
        )
        
        # Configure the model and create cache
        model_name = "gemini-2.0-flash-001"
        system_instruction = "You are an AI reading assistant that helps users understand PDF documents. Answer questions about the document clearly and concisely."
        
        # Create a cached content object
        cache = client.caches.create(
            model=model_name,
            config=genai_types.CreateCachedContentConfig(
                system_instruction=system_instruction,
                contents=[document],
            )
        )
        
        # Generate a unique ID for this cache
        cache_id = str(uuid.uuid4())
        active_caches[cache_id] = cache
        
        # Set expiry time to 1 hour from now
        expiry_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
        client.caches.update(
            name=cache.name,
            config=genai_types.UpdateCachedContentConfig(
                expire_time=expiry_time
            )
        )
        
        return {"cache_id": cache_id, "status": "success", "filename": file.filename}
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_pdf(request: ChatRequest):
    """
    Use the cached PDF context to chat with the AI
    """
    try:
        # Check if cache exists
        if request.cache_id not in active_caches:
            raise HTTPException(status_code=404, detail="Cache not found. Please upload the PDF again.")
        
        cache = active_caches[request.cache_id]
        
        # Prepare history for the chat
        history_content = []
        if request.history:
            for msg in request.history:
                role = "user" if msg.role == "user" else "model"
                history_content.append({"role": role, "parts": [msg.content]})
        
        # Generate content using the cached PDF and the new message
        model_name = "gemini-2.0-flash-001"
        
        response = client.models.generate_content(
            model=model_name,
            contents=request.message,
            config=genai_types.GenerateContentConfig(
                cached_content=cache.name
            )
        )
        
        # Return the response
        return {
            "message": response.text,
            "cache_id": request.cache_id
        }
        
    except Exception as e:
        print(f"Error generating chat response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.delete("/api/cache/{cache_id}")
async def delete_cache(cache_id: str):
    """
    Delete a cache when it's no longer needed
    """
    try:
        if cache_id in active_caches:
            cache = active_caches[cache_id]
            client.caches.delete(cache.name)
            del active_caches[cache_id]
            return {"status": "success", "message": "Cache deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Cache not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting cache: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)