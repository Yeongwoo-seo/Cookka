'use client';

// 정적 생성 방지 (타임아웃 방지)
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFB] p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          404 - 페이지를 찾을 수 없습니다
        </h1>
        <p className="text-gray-600 mb-6">
          요청하신 페이지가 존재하지 않습니다.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-[#4D99CC] text-white rounded-lg font-semibold hover:bg-[#3d89bc] transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
