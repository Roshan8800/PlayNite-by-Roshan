import { NextRequest, NextResponse } from 'next/server';
import { VideoDatabaseService } from '@/lib/services/video-database-service';

const videoDatabaseService = new VideoDatabaseService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Build query from search params
    const query = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      source: searchParams.get('source') || undefined,
      performer: searchParams.get('performer') || undefined,
      minDuration: searchParams.get('minDuration') ? parseInt(searchParams.get('minDuration')!) : undefined,
      maxDuration: searchParams.get('maxDuration') ? parseInt(searchParams.get('maxDuration')!) : undefined,
      minViews: searchParams.get('minViews') ? parseInt(searchParams.get('minViews')!) : undefined,
      sortBy: (searchParams.get('sortBy') || 'views') as any,
      sortOrder: (searchParams.get('sortOrder') || 'desc') as any,
      isHD: searchParams.get('isHD') ? searchParams.get('isHD') === 'true' : undefined,
      isVR: searchParams.get('isVR') ? searchParams.get('isVR') === 'true' : undefined
    };

    console.log(`Loading videos from database with query:`, query);

    // Query videos using the database service
    const result = await videoDatabaseService.queryVideos(query);

    console.log(`Returning ${result.videos.length} videos from page ${result.page} (total: ${result.total})`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error loading video database:', error);

    return NextResponse.json(
      {
        error: 'Failed to load video database',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}