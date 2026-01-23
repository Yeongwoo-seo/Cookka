'use client';

import { useState } from 'react';
import { InventoryItem, PurchaseHistory } from '@/types/inventory';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface InventoryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

export default function InventoryHistoryModal({
  isOpen,
  onClose,
  item,
}: InventoryHistoryModalProps) {
  if (!isOpen || !item) return null;

  const sortedHistory = item.purchaseHistory
    ? [...item.purchaseHistory].sort(
        (a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
              입/출고 히스토리
            </h2>
            <p className="text-sm text-gray-500 mt-1">{item.name}</p>
          </div>
          <button
            onClick={onClose}
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
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* 현재 재고 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">현재 재고</p>
                <p className="text-lg font-semibold">
                  {item.currentStock} {item.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">평균 원가</p>
                <p className="text-lg font-semibold">
                  ${((item.costPerUnit || 0) / 1000).toFixed(2)}/{item.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">총 가치</p>
                <p className="text-lg font-semibold text-blue-600">
                  ${((item.currentStock * (item.costPerUnit || 0)) / 1000).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* 히스토리 목록 */}
          {sortedHistory.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">구매 이력</h3>
              {sortedHistory.map((history) => (
                <div
                  key={history.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-blue-600"
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
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          입고: {history.quantity} {item.unit}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(history.purchaseDate, 'yyyy년 MM월 dd일 HH:mm', {
                            locale: ko,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${((history.costPerUnit || 0) / 1000).toFixed(2)}/{item.unit}
                      </p>
                      <p className="text-sm text-gray-500">
                        총 ${((history.quantity * (history.costPerUnit || 0)) / 1000).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500">등록된 구매 이력이 없습니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
