import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'مركز شحن العملات', description: 'مركز مستقل لإنشاء طلبات الشحن ومتابعة حالتها بشفافية' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ar" dir="rtl"><body>{children}</body></html>; }