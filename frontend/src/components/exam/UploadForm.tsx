/**
 * Exam upload form component.
 * Implements: rerender-functional-setstate, rendering-hoist-jsx
 */
import { useState, useCallback, useRef } from 'react';

interface UploadFormProps {
  onUpload: (data: { file: File; title: string }) => Promise<void>;
  isUploading: boolean;
}

export function UploadForm({ onUpload, isUploading }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file || !title) return;

      try {
        await onUpload({ file, title });
        // Reset form on success
        setTitle('');
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch {
        // Error handled by parent
      }
    },
    [file, title, onUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
      }
    },
    []
  );

  return (
    <div className="bg-white shadow sm:rounded-lg mb-8 p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        새 시험지 업로드
      </h3>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 md:flex md:space-y-0 md:space-x-4 md:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            시험명
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="예: 2024년 1학기 중간고사"
            required
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="file-upload"
            className="block text-sm font-medium text-gray-700"
          >
            파일 (PDF, Image)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            onChange={handleFileChange}
            accept=".pdf,image/*"
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {isUploading ? '업로드 중...' : '업로드'}
        </button>
      </form>
    </div>
  );
}
