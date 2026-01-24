import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analysisService, type AnalysisResult } from '../services/analysis';

// Chart libraries removed (using CSS instead)

export function AnalysisResultPage() {
    const { id } = useParams<{ id: string }>();
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchResult(id);
    }, [id]);

    const fetchResult = async (analysisId: string) => {
        try {
            const data = await analysisService.getResult(analysisId);
            setResult(data);
        } catch (error) {
            alert('분석 결과를 불러오는데 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">로딩 중...</div>;
    if (!result) return <div className="p-8">결과를 찾을 수 없습니다</div>;

    const { summary, questions } = result;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <Link to="/exams" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">&larr; 목록으로 돌아가기</Link>
                <h2 className="text-3xl font-bold text-gray-900">분석 결과</h2>
                <p className="text-gray-500 mt-2">총 {result.total_questions}문항 분석 완료</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">난이도 분포</h3>
                    <div className="space-y-4">
                        {Object.entries(summary.difficulty_distribution).map(([level, count]) => (
                            <div key={level}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-700 capitalize">{level}</span>
                                    <span className="text-sm text-gray-500">{count}문항</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-indigo-600 h-2.5 rounded-full"
                                        style={{ width: `${(count / result.total_questions) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">유형 분포</h3>
                    <div className="space-y-4">
                        {Object.entries(summary.type_distribution).map(([type, count]) => count > 0 && (
                            <div key={type}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                                    <span className="text-sm text-gray-500">{count}문항</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-green-500 h-2.5 rounded-full"
                                        style={{ width: `${(count / result.total_questions) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Question List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">문항별 상세 분석</h3>
                </div>
                <ul className="divide-y divide-gray-200">
                    {questions.map((q) => (
                        <li key={q.id} className="p-4">
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center font-bold text-gray-700">
                                    {q.question_number}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                            {q.difficulty}
                                        </span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                                            {q.question_type}
                                        </span>
                                        {q.points && <span className="text-sm text-gray-500">{q.points}점</span>}
                                    </div>
                                    <p className="text-sm text-gray-900 font-medium">{q.topic}</p>
                                    <p className="text-sm text-gray-500 mt-1">{q.ai_comment}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
