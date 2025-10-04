import { NextResponse } from 'next/server';
import { sitemapService } from '@/lib/services/sitemap-service';

export async function GET() {
  try {
    const sitemap = sitemapService.generateSitemapXML();

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}