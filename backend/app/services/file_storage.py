"""File storage service for handling file uploads."""
import hashlib
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile


class FileStorageService:
    """Service for handling file storage operations."""

    def __init__(self, base_path: str = "uploads"):
        """Initialize file storage service.

        Args:
            base_path: Base directory for file uploads
        """
        self.base_path = Path(base_path)
        self.exams_path = self.base_path / "exams"
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """Ensure upload directories exist."""
        self.exams_path.mkdir(parents=True, exist_ok=True)

    async def save_file(self, file: UploadFile, user_id: str) -> str:
        """Save uploaded file to disk.

        Args:
            file: FastAPI UploadFile object
            user_id: User ID for organizing files

        Returns:
            Relative file path from base_path

        Raises:
            ValueError: If file is invalid or too large
        """
        # Validate file
        if not file.filename:
            raise ValueError("파일명이 없습니다.")

        # Read file content
        content = await file.read()

        # Check file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(content) > max_size:
            raise ValueError("파일 크기가 10MB를 초과합니다.")

        # Generate unique filename using hash
        file_hash = self._get_file_hash(content)
        file_extension = Path(file.filename).suffix.lower()
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{user_id}_{timestamp}_{file_hash[:8]}{file_extension}"

        # Save file
        file_path = self.exams_path / filename
        with open(file_path, "wb") as f:
            f.write(content)

        # Return relative path
        return f"uploads/exams/{filename}"

    def delete_file(self, file_path: str) -> None:
        """Delete file from disk.

        Args:
            file_path: Relative file path from base_path
        """
        full_path = Path(file_path)
        if full_path.exists():
            full_path.unlink()

    def _get_file_hash(self, content: bytes, algorithm: str = "sha256") -> str:
        """Get hash of file content.

        Args:
            content: File content bytes
            algorithm: Hash algorithm (md5, sha256)

        Returns:
            Hexadecimal hash string
        """
        if algorithm == "md5":
            return hashlib.md5(content).hexdigest()
        elif algorithm == "sha256":
            return hashlib.sha256(content).hexdigest()
        else:
            raise ValueError(f"지원하지 않는 해시 알고리즘: {algorithm}")

    def get_file_hash(self, content: bytes) -> str:
        """Get SHA256 hash of file content.

        Args:
            content: File content bytes

        Returns:
            SHA256 hash string
        """
        return self._get_file_hash(content, "sha256")


# Singleton instance
file_storage = FileStorageService()
