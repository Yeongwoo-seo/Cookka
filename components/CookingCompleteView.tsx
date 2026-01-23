'use client';

import { useState } from 'react';
import { DailyMenu } from '@/types/daily-menu';
import { useAppStore } from '@/store/app-store';
import { calculateProfit } from '@/types/business-metrics';

interface CookingCompleteViewProps {
  dailyMenu: DailyMenu;
}

export default function CookingCompleteView({
  dailyMenu,
}: CookingCompleteViewProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const businessMetrics = useAppStore((state) => state.businessMetrics);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setPhotoFiles([...photoFiles, ...files]);
      const newPhotos = files.map((file) => URL.createObjectURL(file));
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const handleSendPhotos = () => {
    // TODO: 실제로 사진을 서버에 전송하는 로직
    console.log('사진 전송:', photoFiles);
    alert('사진이 전송되었습니다!');
  };

  const estimatedRevenue = businessMetrics
    ? businessMetrics.todayRevenue
    : dailyMenu.servings * 5; // 예시: 인분당 $5

  return (
    <div className="w-full">
      <div className="bg-transparent">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {/* GIF 파일이 있으면 사용, 없으면 CSS 애니메이션 체크마크 */}
            <img
              src="/checkmark-animation.gif"
              alt="완료 체크마크"
              className="w-full h-full object-contain"
              onError={(e) => {
                // GIF 로드 실패 시 SVG 애니메이션으로 대체
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('svg')) {
                  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  svg.setAttribute('class', 'w-10 h-10 text-green-600');
                  svg.setAttribute('fill', 'none');
                  svg.setAttribute('stroke', 'currentColor');
                  svg.setAttribute('viewBox', '0 0 24 24');
                  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  path.setAttribute('stroke-linecap', 'round');
                  path.setAttribute('stroke-linejoin', 'round');
                  path.setAttribute('stroke-width', '2');
                  path.setAttribute('d', 'M5 13l4 4L19 7');
                  path.setAttribute('class', 'checkmark-path');
                  svg.appendChild(path);
                  parent.appendChild(svg);
                }
              }}
            />
          </div>
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
            요리를 완료했습니다!
          </h2>
        </div>

        {/* 예상 수익 */}
        <div className="bg-white rounded-xl p-6 mb-8 text-center">
          <p className="text-sm text-gray-600 mb-2">예상 수익</p>
          <p className="text-3xl font-bold text-[#4D99CC]">
            ${(estimatedRevenue / 1000).toFixed(2)}
          </p>
        </div>

        {/* 사진 첨부 */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-4" style={{ color: '#1A1A1A' }}>
            사진 첨부
          </label>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                <img
                  src={photo}
                  alt={`요리 사진 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    const newPhotos = photos.filter((_, i) => i !== index);
                    const newFiles = photoFiles.filter((_, i) => i !== index);
                    setPhotos(newPhotos);
                    setPhotoFiles(newFiles);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 9 && (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#4D99CC] transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </label>
            )}
          </div>
        </div>

        <button
          onClick={handleSendPhotos}
          className="w-full py-4 bg-[#4D99CC] text-white rounded-xl font-semibold text-lg hover:bg-[#3d89bc] transition-colors shadow-md"
        >
          사진 전송
        </button>
      </div>
    </div>
  );
}
