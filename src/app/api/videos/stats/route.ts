import { NextResponse } from 'next/server';
import { VideoDatabaseService } from '@/lib/services/video-database-service';

const videoDatabaseService = new VideoDatabaseService();

export async function GET() {
  try {
    console.log('Fetching video database statistics...');

    // Get actual stats from the database service
    const stats = await videoDatabaseService.getDatabaseStats();

    console.log(`Stats calculated: ${stats.totalVideos} videos, ${stats.sources.length} sources`);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error getting video stats:', error);

    return NextResponse.json(
      {
        error: 'Failed to get video statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}