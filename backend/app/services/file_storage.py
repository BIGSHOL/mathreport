"""File storage service for handling file uploads.

Supports:
- Local filesystem storage (development)
- Supabase Storage (production)
"""
import hashlib
import httpx
from datetime import datetime
from pathlib import Path
from typing import Protocol

from fastapi import UploadFile

from app.core.config import settings


class StorageBackend(Protocol):
    """Storage backend protocol."""

    async def upload(self, content: bytes, path: str, content_type: str) -> str:
        """Upload file and return public URL or path."""
        ...

    async def delete(self, path: str) -> None:
        """Delete file."""
        ...


class LocalStorageBackend:
    """Local filesystem storage backend."""

    def __init__(self, base_path: str = "uploads"):
        self.base_path = Path(base_path)
        self.exams_path = self.base_path / "exams"
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        self.exams_path.mkdir(parents=True, exist_ok=True)

    async def upload(self, content: bytes, path: str, content_type: str) -> str:
        """Save file to local filesystem."""
        file_path = self.base_path / path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(content)
        return f"uploads/{path}"

    async def delete(self, path: str) -> None:
        """Delete file from local filesystem."""
        # path format: "uploads/exams/filename" or "exams/filename"
        if path.startswith("uploads/"):
            full_path = Path(path)
        else:
            full_path = self.base_path / path
        if full_path.exists():
            full_path.unlink()


class SupabaseStorageBackend:
    """Supabase Storage backend."""

    BUCKET_NAME = "exams"

    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        if not self.url or not self.service_key:
            raise ValueError("Supabase URL과 서비스 롤 키가 필요합니다")

    @property
    def storage_url(self) -> str:
        return f"{self.url}/storage/v1"

    @property
    def headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }

    async def _ensure_bucket(self) -> None:
        """Ensure the bucket exists (create if not)."""
        async with httpx.AsyncClient() as client:
            # Check if bucket exists
            response = await client.get(
                f"{self.storage_url}/bucket/{self.BUCKET_NAME}",
                headers=self.headers,
            )
            print(f"[Storage] Bucket check: {response.status_code} - {response.text[:200] if response.text else 'empty'}")

            if response.status_code != 200:
                # Create bucket
                print(f"[Storage] Creating bucket: {self.BUCKET_NAME}")
                create_response = await client.post(
                    f"{self.storage_url}/bucket",
                    headers={**self.headers, "Content-Type": "application/json"},
                    json={
                        "id": self.BUCKET_NAME,
                        "name": self.BUCKET_NAME,
                        "public": False,
                        "file_size_limit": 52428800,  # 50MB
                        "allowed_mime_types": ["application/pdf", "image/png", "image/jpeg", "image/webp"],
                    },
                )
                if create_response.status_code >= 400:
                    print(f"[Storage] Bucket creation failed: {create_response.status_code} - {create_response.text}")
                    raise ValueError(f"버킷 생성 실패: {create_response.text}")
                else:
                    print(f"[Storage] Bucket created successfully")

    async def upload(self, content: bytes, path: str, content_type: str) -> str:
        """Upload file to Supabase Storage."""
        await self._ensure_bucket()

        # path format: "exams/filename"
        file_path = path if not path.startswith("exams/") else path[6:]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.storage_url}/object/{self.BUCKET_NAME}/{file_path}",
                headers={
                    **self.headers,
                    "Content-Type": content_type,
                    "x-upsert": "true",  # 기존 파일 덮어쓰기 허용
                },
                content=content,
            )

            # 상세 에러 로깅
            if response.status_code >= 400:
                print(f"[Storage] Upload failed: {response.status_code} - {response.text}")

            response.raise_for_status()

        # Return the storage path (not public URL since bucket is private)
        return f"supabase://{self.BUCKET_NAME}/{file_path}"

    async def delete(self, path: str) -> None:
        """Delete file from Supabase Storage."""
        # Parse path: "supabase://bucket/path" or "exams/filename"
        if path.startswith("supabase://"):
            parts = path[11:].split("/", 1)
            bucket = parts[0]
            file_path = parts[1] if len(parts) > 1 else ""
        else:
            bucket = self.BUCKET_NAME
            file_path = path.replace("uploads/exams/", "").replace("exams/", "")

        async with httpx.AsyncClient() as client:
            await client.delete(
                f"{self.storage_url}/object/{bucket}/{file_path}",
                headers=self.headers,
            )

    async def get_signed_url(self, path: str, expires_in: int = 3600) -> str:
        """Get a signed URL for private file access."""
        if path.startswith("supabase://"):
            parts = path[11:].split("/", 1)
            bucket = parts[0]
            file_path = parts[1] if len(parts) > 1 else ""
        else:
            bucket = self.BUCKET_NAME
            file_path = path.replace("uploads/exams/", "").replace("exams/", "")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.storage_url}/object/sign/{bucket}/{file_path}",
                headers=self.headers,
                json={"expiresIn": expires_in},
            )
            response.raise_for_status()
            data = response.json()
            return f"{self.url}/storage/v1{data['signedURL']}"

    async def download(self, path: str) -> bytes:
        """Download file content from Supabase Storage."""
        if path.startswith("supabase://"):
            parts = path[11:].split("/", 1)
            bucket = parts[0]
            file_path = parts[1] if len(parts) > 1 else ""
        else:
            bucket = self.BUCKET_NAME
            file_path = path.replace("uploads/exams/", "").replace("exams/", "")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{self.storage_url}/object/{bucket}/{file_path}",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.content


class FileStorageService:
    """Service for handling file storage operations.

    Automatically uses Supabase Storage in production,
    falls back to local filesystem in development.
    """

    def __init__(self, base_path: str = "uploads"):
        """Initialize file storage service."""
        self.base_path = base_path

        # Use Supabase if configured, otherwise local
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            self._backend: StorageBackend = SupabaseStorageBackend()
            self._use_supabase = True
        else:
            self._backend = LocalStorageBackend(base_path)
            self._use_supabase = False

    @property
    def use_supabase(self) -> bool:
        return self._use_supabase

    async def save_file(self, file: UploadFile, user_id: str) -> str:
        """Save uploaded file.

        Args:
            file: FastAPI UploadFile object
            user_id: User ID for organizing files

        Returns:
            File path or URL

        Raises:
            ValueError: If file is invalid or too large
        """
        if not file.filename:
            raise ValueError("파일명이 없습니다.")

        content = await file.read()

        # Check file size (20MB limit)
        max_size = 20 * 1024 * 1024
        if len(content) > max_size:
            raise ValueError("파일 크기가 20MB를 초과합니다.")

        # Generate unique filename
        file_hash = self._get_file_hash(content)
        file_extension = Path(file.filename).suffix.lower()
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{user_id}_{timestamp}_{file_hash[:8]}{file_extension}"

        # Determine content type
        content_type = file.content_type or "application/octet-stream"

        # Upload to backend
        path = f"exams/{filename}"
        return await self._backend.upload(content, path, content_type)

    async def save_files(self, files: list[UploadFile], user_id: str) -> list[str]:
        """Save multiple uploaded files."""
        file_paths = []
        for i, file in enumerate(files):
            await file.seek(0)
            path = await self.save_file(file, f"{user_id}_p{i+1:02d}")
            file_paths.append(path)
        return file_paths

    def delete_files(self, file_paths: str) -> None:
        """Delete multiple files (sync wrapper for backward compatibility)."""
        import asyncio
        for path in file_paths.split(","):
            asyncio.create_task(self._backend.delete(path.strip()))

    async def delete_file_async(self, file_path: str) -> None:
        """Delete file asynchronously."""
        await self._backend.delete(file_path)

    def delete_file(self, file_path: str) -> None:
        """Delete file (sync wrapper for backward compatibility)."""
        import asyncio
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._backend.delete(file_path))
        except RuntimeError:
            # No running loop, run synchronously
            asyncio.run(self._backend.delete(file_path))

    async def get_file_url(self, file_path: str, expires_in: int = 3600) -> str:
        """Get accessible URL for a file.

        For Supabase: Returns a signed URL
        For local: Returns the file path (requires serving via FastAPI)
        """
        if self._use_supabase and isinstance(self._backend, SupabaseStorageBackend):
            return await self._backend.get_signed_url(file_path, expires_in)
        return file_path

    async def download_file(self, file_path: str) -> bytes:
        """Download file content.

        For Supabase: Downloads from Supabase Storage
        For local: Reads from local filesystem
        """
        if self._use_supabase and isinstance(self._backend, SupabaseStorageBackend):
            return await self._backend.download(file_path)
        else:
            # Local file
            from pathlib import Path
            if file_path.startswith("uploads/"):
                local_path = Path(file_path)
            else:
                local_path = Path(self.base_path) / file_path
            return local_path.read_bytes()

    def _get_file_hash(self, content: bytes, algorithm: str = "sha256") -> str:
        """Get hash of file content."""
        if algorithm == "md5":
            return hashlib.md5(content).hexdigest()
        elif algorithm == "sha256":
            return hashlib.sha256(content).hexdigest()
        else:
            raise ValueError(f"지원하지 않는 해시 알고리즘: {algorithm}")

    def get_file_hash(self, content: bytes) -> str:
        """Get SHA256 hash of file content."""
        return self._get_file_hash(content, "sha256")


# Singleton instance
file_storage = FileStorageService()
