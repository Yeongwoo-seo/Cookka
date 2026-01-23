'use client';

import { useAppStore } from '@/store/app-store';
import { UserRole, roleLabels } from '@/types/team';

export default function TeamSettingsView() {
  const team = useAppStore((state) => state.team);
  const currentUser = useAppStore((state) => state.currentUser);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">팀 설정</h2>

      {team ? (
        <div className="space-y-6">
          {/* 팀 정보 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">팀 정보</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">팀명</p>
                <p className="text-lg font-semibold">{team.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">사업자명</p>
                <p className="text-lg font-semibold">
                  {team.businessInfo.businessName}
                </p>
              </div>
              {team.businessInfo.address && (
                <div>
                  <p className="text-sm text-gray-600">주소</p>
                  <p className="text-lg">{team.businessInfo.address}</p>
                </div>
              )}
              {team.businessInfo.phone && (
                <div>
                  <p className="text-sm text-gray-600">전화번호</p>
                  <p className="text-lg">{team.businessInfo.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* 팀원 목록 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">팀원 목록</h3>
            <div className="space-y-3">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'rgba(77, 153, 204, 0.1)', color: '#4D99CC' }}>
                    {roleLabels[member.role]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-gray-500">팀 정보가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">
            팀을 생성하거나 초대를 받아주세요.
          </p>
        </div>
      )}
    </div>
  );
}
