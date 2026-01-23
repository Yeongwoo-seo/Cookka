'use client';

import { useState, useRef } from 'react';
import { InventoryItem } from '@/types/inventory';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: InventoryItem) => void;
  initialItem?: InventoryItem; // 수정 모드용
}

const units = ['kg', 'g', 'L', 'mL', '개', '봉', '박스', '팩'];

export default function AddInventoryModal({
  isOpen,
  onClose,
  onAdd,
  initialItem,
}: AddInventoryModalProps) {
  const isEditMode = !!initialItem;
  const [name, setName] = useState(initialItem?.name || '');
  const [unit, setUnit] = useState(initialItem?.unit || 'kg');
  const [currentStock, setCurrentStock] = useState(initialItem?.currentStock.toString() || '');
  const [costPerUnit, setCostPerUnit] = useState(initialItem?.costPerUnit.toString() || '');
  const [expirationDate, setExpirationDate] = useState(
    initialItem?.expirationDate ? initialItem.expirationDate.toISOString().split('T')[0] : ''
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isCalculatingExpiration, setIsCalculatingExpiration] = useState(false);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingOCR(true);
    
    try {
      // 이미지를 Base64로 변환
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        try {
          // OCR API 호출 (Gemini API 사용)
          const response = await fetch('/api/gemini/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64Image }),
          });

          if (!response.ok) {
            throw new Error('OCR 처리 실패');
          }

          const data = await response.json();
          
          // OCR 결과에서 재고 정보 추출
          if (data.text) {
            // 간단한 파싱: 이름, 수량, 가격 추출 시도
            const text = data.text;
            
            // 재고명 추출 (첫 번째 줄 또는 명확한 패턴)
            const nameMatch = text.match(/([가-힣a-zA-Z\s]+)/);
            if (nameMatch) {
              setName(nameMatch[1].trim());
            }
            
            // 수량 추출 (숫자 + 단위 패턴)
            const quantityMatch = text.match(/(\d+\.?\d*)\s*(kg|g|L|mL|개|봉|박스|팩)/);
            if (quantityMatch) {
              setCurrentStock(quantityMatch[1]);
              setUnit(quantityMatch[2]);
            }
            
            // 가격 추출 ($ 또는 숫자 패턴)
            const priceMatch = text.match(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
            if (priceMatch) {
              const price = priceMatch[1].replace(/,/g, '');
              // $를 원으로 변환 (예: $10 = 10,000원)
              setCostPerUnit((parseFloat(price) * 1000).toString());
            }
          }
        } catch (error) {
          console.error('OCR 처리 오류:', error);
          alert('OCR 처리 중 오류가 발생했습니다.');
        } finally {
          setIsProcessingOCR(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      setIsProcessingOCR(false);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const calculateExpirationDate = async (itemName: string) => {
    if (!itemName.trim()) return;
    
    setIsCalculatingExpiration(true);
    try {
      const response = await fetch('/api/gemini/expiration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemName: itemName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.expirationDays) {
          const expiration = new Date();
          expiration.setDate(expiration.getDate() + data.expirationDays);
          setExpirationDate(expiration.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('유통기한 계산 오류:', error);
    } finally {
      setIsCalculatingExpiration(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유통기한이 없으면 자동 계산
    let finalExpirationDate: string | undefined = expirationDate;
    if (!expirationDate && name.trim()) {
      await calculateExpirationDate(name.trim());
      // 계산 완료 후 최종 값 확인
      await new Promise(resolve => setTimeout(resolve, 500));
      finalExpirationDate = expirationDate || undefined;
    }

    const newItem: InventoryItem = {
      id: isEditMode ? initialItem!.id : Date.now().toString(),
      name: name.trim(),
      currentStock: parseFloat(currentStock) || 0,
      unit,
      costPerUnit: parseFloat(costPerUnit) || 0,
      minimumStock: initialItem?.minimumStock || 0,
      expirationDate: finalExpirationDate ? new Date(finalExpirationDate) : undefined,
      lastUpdated: new Date(),
      purchaseHistory: isEditMode 
        ? (initialItem?.purchaseHistory || [])
        : [{
            id: Date.now().toString(),
            quantity: parseFloat(currentStock) || 0,
            costPerUnit: parseFloat(costPerUnit) || 0,
            purchaseDate: new Date(), // 오늘이 디폴트
          }],
    };

    onAdd(newItem);
    
    // 폼 초기화
    if (!isEditMode) {
      setName('');
      setUnit('kg');
      setCurrentStock('');
      setCostPerUnit('');
      setExpirationDate('');
    }
    onClose();
  };

  const handleClose = () => {
    // 폼 초기화
    setName('');
    setUnit('kg');
    setCurrentStock('');
    setCostPerUnit('');
    setExpirationDate('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
            {isEditMode ? '재고 수정' : '재고 등록'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-4">
            {/* 카메라 버튼 */}
            <div className="flex justify-center mb-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleCameraClick}
                disabled={isProcessingOCR}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingOCR ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>카메라로 촬영</span>
                  </>
                )}
              </button>
            </div>

            {/* 재고명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                재고명 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // 재고명이 입력되고 유통기한이 없으면 자동 계산
                  if (e.target.value.trim() && !expirationDate) {
                    calculateExpirationDate(e.target.value.trim());
                  }
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                placeholder="예: 밥, 김치, 양파"
              />
            </div>

            {/* 단위 및 현재 재고량 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  단위 *
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수량 *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                  placeholder="0"
                />
              </div>
            </div>

            {/* 원가 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                원가 (단가) * <span className="text-xs text-gray-500">($ 기준)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPerUnit ? (parseFloat(costPerUnit) / 1000).toFixed(2) : ''}
                  onChange={(e) => {
                    const dollarValue = parseFloat(e.target.value) || 0;
                    setCostPerUnit((dollarValue * 1000).toString());
                  }}
                  required
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* 유통기한 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                유통기한
                {isCalculatingExpiration && (
                  <span className="ml-2 text-xs text-blue-600">계산 중...</span>
                )}
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
              />
              {!expirationDate && name && (
                <button
                  type="button"
                  onClick={() => calculateExpirationDate(name)}
                  disabled={isCalculatingExpiration}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  자동 계산
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 p-3 rounded-b-2xl flex-shrink-0">
          <button
            type="submit"
            onClick={handleSubmit}
            className="w-full px-4 py-2.5 bg-[#4D99CC] text-white rounded-lg hover:bg-[#3d89bc] transition-colors text-base font-medium"
          >
            {isEditMode ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
