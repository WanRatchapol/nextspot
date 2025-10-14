import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NextSpot - ค้นหาสถานที่ที่ใช่สำหรับคุณ',
  description: 'Find your perfect spot in Bangkok by swiping. Quick travel recommendations for Thai university students.',
  keywords: ['travel', 'bangkok', 'recommendations', 'university', 'students'],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#6366f1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}