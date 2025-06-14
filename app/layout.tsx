import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Spotlight',
  description: 'A migrated Next.js app',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en">
        <body>
          <Toaster />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}