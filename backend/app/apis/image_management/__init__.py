"""Image Management API - Upload images and search from Unsplash"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
import databutton as db
import httpx
from app.auth import AuthorizedUser
import os
from app.libs.url_helpers import get_api_base_url

router = APIRouter(prefix="/image-management")

# ==================== Models ====================

class UnsplashImage(BaseModel):
    id: str
    url: str
    thumb_url: str
    description: Optional[str]
    photographer: str
    photographer_url: str
    download_location: str  # Required for attribution tracking

class ImageSearchResponse(BaseModel):
    total: int
    images: List[UnsplashImage]

class ImageUploadResponse(BaseModel):
    url: str
    filename: str

# ==================== Endpoints ====================

@router.post("/upload")
async def upload_image(
    user: AuthorizedUser,
    file: UploadFile = File(...)
) -> ImageUploadResponse:
    """Upload an image file and return the public URL (admin only)"""
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Read file content
    file_content = await file.read()
    
    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 5MB limit"
        )
    
    # Sanitize filename
    import re
    filename = file.filename or "uploaded_image.jpg"
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Add timestamp to ensure uniqueness
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    storage_key = f"uploaded_images_{timestamp}_{safe_filename}"
    
    # Store in binary storage
    try:
        db.storage.binary.put(storage_key, file_content)
        
        # Return URL to our serve endpoint
        serve_url = f"{get_api_base_url()}/image-management/serve/{storage_key}"
        
        return ImageUploadResponse(
            url=serve_url,
            filename=safe_filename
        )
    except Exception as e:
        print(f"Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload image")


@router.get("/serve/{file_path:path}")
async def serve_image(file_path: str):
    """Serve an uploaded image from storage (public endpoint)"""
    try:
        # Get file from storage
        file_content = db.storage.binary.get(file_path)
        
        # Determine content type from file extension
        content_type = "image/jpeg"  # default
        if file_path.lower().endswith('.png'):
            content_type = "image/png"
        elif file_path.lower().endswith('.webp'):
            content_type = "image/webp"
        elif file_path.lower().endswith(('.jpg', '.jpeg')):
            content_type = "image/jpeg"
        
        return Response(
            content=file_content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
            }
        )
    except Exception as e:
        print(f"Error serving image {file_path}: {str(e)}")
        raise HTTPException(status_code=404, detail="Image not found")


@router.get("/profile-picture/{storage_key}")
async def serve_profile_picture(storage_key: str):
    """Serve profile picture from storage (public endpoint)"""
    try:
        # Get file from storage
        file_content = db.storage.binary.get(storage_key)
        
        # Determine content type from file extension
        content_type = "image/jpeg"  # default
        if storage_key.lower().endswith('.png'):
            content_type = "image/png"
        elif storage_key.lower().endswith('.jpg') or storage_key.lower().endswith('.jpeg'):
            content_type = "image/jpeg"
        
        return Response(
            content=file_content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
            }
        )
    except Exception as e:
        print(f"❌ Failed to serve profile picture: {str(e)}")
        raise HTTPException(status_code=404, detail="Profile picture not found")


@router.get("/search")
async def search_images(
    query: str,
    page: int = 1,
    per_page: int = 12
) -> ImageSearchResponse:
    """Search for images on Unsplash (open endpoint for image browsing)"""
    
    # Get Unsplash API key
    try:
        unsplash_key = os.environ.get("UNSPLASH_ACCESS_KEY")
    except:
        raise HTTPException(
            status_code=503,
            detail="Unsplash API is not configured. Please add UNSPLASH_ACCESS_KEY to secrets."
        )
    
    if not unsplash_key:
        raise HTTPException(
            status_code=503,
            detail="Unsplash API key is not configured"
        )
    
    # Call Unsplash API
    url = "https://api.unsplash.com/search/photos"
    headers = {
        "Authorization": f"Client-ID {unsplash_key}"
    }
    params = {
        "query": query,
        "page": page,
        "per_page": per_page,
        "orientation": "landscape"  # Good default for featured images
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Transform response to our format
            images = []
            for photo in data.get('results', []):
                images.append(UnsplashImage(
                    id=photo['id'],
                    url=photo['urls']['regular'],
                    thumb_url=photo['urls']['thumb'],
                    description=photo.get('description') or photo.get('alt_description'),
                    photographer=photo['user']['name'],
                    photographer_url=photo['user']['links']['html'],
                    download_location=photo['links']['download_location']
                ))
            
            return ImageSearchResponse(
                total=data.get('total', 0),
                images=images
            )
            
    except httpx.HTTPStatusError as e:
        print(f"Unsplash API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch images from Unsplash"
        )
    except Exception as e:
        print(f"Error searching images: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while searching for images"
        )


@router.post("/track-download/{photo_id}")
async def track_unsplash_download(photo_id: str) -> dict:
    """Track when an Unsplash image is downloaded/used (required by Unsplash API guidelines)"""
    
    try:
        unsplash_key = os.environ.get("UNSPLASH_ACCESS_KEY")
    except:
        # Silently fail - tracking is nice-to-have
        return {"success": False, "message": "Unsplash API not configured"}
    
    if not unsplash_key:
        return {"success": False, "message": "Unsplash API key not configured"}
    
    # Get download location from the photo details
    try:
        async with httpx.AsyncClient() as client:
            # First get the photo details to get the download_location
            photo_url = f"https://api.unsplash.com/photos/{photo_id}"
            headers = {"Authorization": f"Client-ID {unsplash_key}"}
            
            photo_response = await client.get(photo_url, headers=headers)
            photo_response.raise_for_status()
            photo_data = photo_response.json()
            
            download_location = photo_data['links']['download_location']
            
            # Trigger download tracking
            download_response = await client.get(download_location, headers=headers)
            download_response.raise_for_status()
            
            return {"success": True, "message": "Download tracked"}
            
    except Exception as e:
        print(f"Error tracking download: {str(e)}")
        return {"success": False, "message": str(e)}
