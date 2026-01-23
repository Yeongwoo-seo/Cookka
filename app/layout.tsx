import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cookka - 팀 협업형 도시락 비즈니스 관리',
  description: '레시피 공유, 실시간 재고 관리, 수익성 분석을 한 화면에서',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
