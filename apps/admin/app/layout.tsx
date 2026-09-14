import type { Metadata } from 'next';
import { defaultLocale, t } from '@health/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: t(defaultLocale, 'foundation.adminTitle'),
  description: t(defaultLocale, 'foundation.adminReady'),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
