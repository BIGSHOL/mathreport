import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export function Layout() {
    const { user } = useAuthStore();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <Link to="/" className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold text-indigo-600">시험지분석</span>
                            </Link>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {user && (
                                    <>
                                        <Link
                                            to="/exams"
                                            className={`${isActive('/exams')
                                                ? 'border-indigo-500 text-gray-900'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                        >
                                            시험지 관리
                                        </Link>
                                        {/* 출제 경향: 마스터 계정만 활성화, 일반 사용자는 비활성 표시 */}
                                        {user?.role === 'admin' ? (
                                            <Link
                                                to="/trends"
                                                className={`${isActive('/trends')
                                                    ? 'border-indigo-500 text-gray-900'
                                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                            >
                                                출제 경향
                                            </Link>
                                        ) : (
                                            <span
                                                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-300 cursor-not-allowed"
                                                title="데이터 누적 후 오픈 예정"
                                            >
                                                출제 경향
                                                <span className="ml-1 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">준비중</span>
                                            </span>
                                        )}
                                    </>
                                )}
                                {/* 요금제: 마스터 계정만 활성화, 일반 사용자는 비활성 표시 */}
                                {user?.role === 'admin' ? (
                                    <Link
                                        to="/pricing"
                                        className={`${isActive('/pricing')
                                            ? 'border-indigo-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                            } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                    >
                                        요금제
                                    </Link>
                                ) : (
                                    <span
                                        className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-300 cursor-not-allowed"
                                        title="결제 시스템 준비 중"
                                    >
                                        요금제
                                        <span className="ml-1 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">준비중</span>
                                    </span>
                                )}
                                {user && (
                                    <Link
                                        to="/profile"
                                        className={`${isActive('/profile')
                                            ? 'border-indigo-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                            } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                    >
                                        내 정보
                                    </Link>
                                )}
                                {user?.role === 'admin' && (
                                    <>
                                        <Link
                                            to="/admin/users"
                                            className={`${location.pathname === '/admin/users'
                                                ? 'border-indigo-500 text-gray-900'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                        >
                                            사용자 관리
                                        </Link>
                                        <Link
                                            to="/admin/patterns"
                                            className={`${location.pathname === '/admin/patterns'
                                                ? 'border-indigo-500 text-gray-900'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                        >
                                            패턴 관리
                                        </Link>
                                        <Link
                                            to="/admin/school-trends"
                                            className={`${location.pathname === '/admin/school-trends'
                                                ? 'border-indigo-500 text-gray-900'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                        >
                                            학교 경향
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Explicit conditional render (rendering-conditional-render) */}
                            {user ? (
                                <span className="text-sm text-gray-700">
                                    환영합니다, <strong>{user.nickname}</strong>
                                </span>
                            ) : location.pathname !== '/login' && location.pathname !== '/register' ? (
                                <div className="space-x-4">
                                    <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                                        로그인
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        회원가입
                                    </Link>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
}
