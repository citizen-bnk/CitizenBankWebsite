"""Google Drive service for OAuth authentication and file operations."""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from app import runtime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
import io
import os


class GoogleDriveService:
    """Service for interacting with Google Drive API."""

    SCOPES = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
    ]

    def __init__(self):
        self.client_id = os.environ.get("GOOGLE_DRIVE_CLIENT_ID")
        self.client_secret = os.environ.get("GOOGLE_DRIVE_CLIENT_SECRET")

    def create_auth_url(self, redirect_uri: str, state: str) -> str:
        """Create OAuth authorization URL."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri],
                }
            },
            scopes=self.SCOPES,
            redirect_uri=redirect_uri,
        )
        flow.authorization_url(state=state)
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state,
            prompt='consent'  # Force consent to get refresh token
        )
        return auth_url

    def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri],
                }
            },
            scopes=self.SCOPES,
            redirect_uri=redirect_uri,
        )
        flow.fetch_token(code=code)
        credentials = flow.credentials

        return {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_expires_at": datetime.utcnow() + timedelta(seconds=3600),
        }

    def get_credentials(self, access_token: str, refresh_token: str) -> Credentials:
        """Create credentials object from tokens with auto-refresh enabled."""
        return Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.SCOPES,
        )

    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        credentials = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.SCOPES,
        )
        
        # Import Request for refreshing credentials
        from google.auth.transport.requests import Request
        
        # Refresh the token
        credentials.refresh(Request())
        
        return {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token or refresh_token,  # Keep old refresh token if new one not provided
            "token_expires_at": datetime.utcnow() + timedelta(seconds=3600),
        }

    def build_service(self, credentials: Credentials):
        """Build Google Drive service client."""
        return build('drive', 'v3', credentials=credentials)

    def list_files_in_folder(self, folder_id: str, credentials: Credentials) -> List[Dict[str, Any]]:
        """List all files in a specific folder."""
        service = self.build_service(credentials)
        results = []
        page_token = None

        while True:
            response = service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)",
                pageToken=page_token,
                pageSize=100
            ).execute()

            results.extend(response.get('files', []))
            page_token = response.get('nextPageToken')

            if not page_token:
                break

        return results

    def download_file(self, file_id: str, credentials: Credentials) -> bytes:
        """Download file content from Google Drive."""
        service = self.build_service(credentials)
        request = service.files().get_media(fileId=file_id)
        file_buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(file_buffer, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()

        file_buffer.seek(0)
        return file_buffer.read()

    def move_file(self, file_id: str, new_parent_id: str, credentials: Credentials) -> Dict[str, Any]:
        """Move file to a different folder."""
        service = self.build_service(credentials)
        
        # Get current parents
        file = service.files().get(fileId=file_id, fields='parents').execute()
        previous_parents = ",".join(file.get('parents', []))

        # Move file
        updated_file = service.files().update(
            fileId=file_id,
            addParents=new_parent_id,
            removeParents=previous_parents,
            fields='id, name, parents'
        ).execute()

        return updated_file

    def rename_file(self, file_id: str, new_name: str, credentials: Credentials) -> Dict[str, Any]:
        """Rename a file in Google Drive."""
        service = self.build_service(credentials)
        updated_file = service.files().update(
            fileId=file_id,
            body={'name': new_name},
            fields='id, name'
        ).execute()
        return updated_file

    def create_folder(self, folder_name: str, parent_folder_id: str, credentials: Credentials) -> Dict[str, Any]:
        """Create a new folder in Google Drive."""
        service = self.build_service(credentials)
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_folder_id]
        }
        folder = service.files().create(body=file_metadata, fields='id, name').execute()
        return folder

    def get_folder_by_name(self, folder_name: str, parent_folder_id: str, credentials: Credentials) -> Optional[Dict[str, Any]]:
        """Find folder by name within a parent folder."""
        service = self.build_service(credentials)
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and '{parent_folder_id}' in parents and trashed=false"
        
        results = service.files().list(
            q=query,
            fields='files(id, name)',
            pageSize=1
        ).execute()

        files = results.get('files', [])
        return files[0] if files else None

    def get_or_create_folder(self, folder_name: str, parent_folder_id: str, credentials: Credentials) -> Dict[str, Any]:
        """Get existing folder or create if it doesn't exist."""
        existing = self.get_folder_by_name(folder_name, parent_folder_id, credentials)
        if existing:
            return existing
        return self.create_folder(folder_name, parent_folder_id, credentials)

    def upload_file(self, file_content: bytes, file_name: str, parent_folder_id: str, mime_type: str, credentials: Credentials) -> Dict[str, Any]:
        """Upload a file to Google Drive and return file metadata including webViewLink."""
        service = self.build_service(credentials)
        
        file_metadata = {
            'name': file_name,
            'parents': [parent_folder_id]
        }
        
        # Create media upload from bytes
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype=mime_type,
            resumable=True
        )
        
        # Upload file
        uploaded_file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink, size, createdTime'
        ).execute()
        
        return uploaded_file
