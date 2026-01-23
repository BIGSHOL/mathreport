import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examService, type Exam } from '../services/exam';
import { analysisService } from '../services/analysis';

export function ExamDashboardPage() {
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await examService.getList(1, 100);
            setExams(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) return;

        setUploading(true);
        try {
            await examService.upload({
                file,
                title,
                subject: '수학'
            });
            setTitle('');
            setFile(null);
            // Reset file input
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            await fetchExams();
        } catch (error) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleAnalyze = async (examId: string) => {
        // Set status to analyzing locally immediately for UI feedback
        setExams(prev => prev.map(e => e.id === examId ? { ...e, status: 'analyzing' } : e));

        try {
            const result = await analysisService.requestAnalysis(examId);
            // mock returns immediately
            navigate(`/analysis/${result.analysis_id}`);
        } catch (error) {
            alert('Analysis request failed');
            fetchExams(); // Revert status
        }
    };

    const handleDelete = async (examId: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await examService.delete(examId);
            setExams(prev => prev.filter(e => e.id !== examId));
        } catch (error) {
            alert('Delete failed');
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        시험지 관리
                    </h2>
                </div>
            </div>

            {/* Upload Form */}
            <div className="bg-white shadow sm:rounded-lg mb-8 p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">새 시험지 업로드</h3>
                <form onSubmit={handleUpload} className="space-y-4 md:flex md:space-y-0 md:space-x-4 md:items-end">
                    <div className="flex-1">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">시험명</label>
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
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">파일 (PDF, Image)</label>
                        <input
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
                        disabled={uploading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {uploading ? '업로드 중...' : '업로드'}
                    </button>
                </form>
            </div>

            {/* List Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <ul className="divide-y divide-gray-200">
                    {exams.length === 0 ? (
                        <li className="p-6 text-center text-gray-500">등록된 시험지가 없습니다.</li>
                    ) : (
                        exams.map((exam) => (
                            <li key={exam.id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-indigo-600 truncate">{exam.title}</p>
                                        <p className="flex items-center text-sm text-gray-500 mt-1">
                                            <span className="truncate">{exam.subject}</span>
                                            <span className="mx-2">•</span>
                                            <span className="capitalize">{exam.status}</span>
                                            <span className="mx-2">•</span>
                                            <span>{new Date(exam.created_at).toLocaleDateString()}</span>
                                        </p>
                                    </div>
                                    <div className="ml-4 flex-shrink-0 flex space-x-4">
                                        {exam.status === 'completed' ? (
                                            <button
                                                onClick={() => handleAnalyze(exam.id)}
                                                className="text-indigo-600 hover:text-indigo-900 font-medium"
                                            >
                                                결과 보기
                                            </button>
                                        ) : exam.status === 'analyzing' ? (
                                            <span className="text-gray-400">분석 중...</span>
                                        ) : (
                                            <button
                                                onClick={() => handleAnalyze(exam.id)}
                                                className="text-green-600 hover:text-green-900 font-medium"
                                            >
                                                분석 요청
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(exam.id)}
                                            className="text-red-600 hover:text-red-900 font-medium"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
