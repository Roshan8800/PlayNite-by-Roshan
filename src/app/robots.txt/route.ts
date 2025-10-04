import { NextResponse } from 'next/server';
import { sitemapService } from '@/lib/services/sitemap-service';

export async function GET() {
  try {
    const robotsTxt = sitemapService.generateRobotsTxt();

    return new NextResponse(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    return new NextResponse('Error generating robots.txt', { status: 500 });
  }
}