import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { seoService } from "@/lib/services/seo-service";

export const metadata: Metadata = {
  title: 'PlayNite - Premium Social Media Platform',
  description: 'Join PlayNite, the premium social media platform for sharing images, videos, and connecting with friends. Experience social features, reels, and stories.',
  keywords: ['PlayNite', 'social media', 'community', 'content sharing', 'social networking'],
  openGraph: {
    title: 'PlayNite - Premium Social Media Platform',
    description: 'Join PlayNite, the premium social media platform for sharing images, videos, and connecting with friends.',
    url: 'https://playnite.com',
    siteName: 'PlayNite',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@playnite',
    title: 'PlayNite - Premium Social Media Platform',
    description: 'Join PlayNite, the premium social media platform for sharing images, videos, and connecting with friends.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-background text-foreground antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
