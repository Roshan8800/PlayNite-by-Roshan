import { NextResponse } from 'next/server';
import { VideoDatabaseService } from '@/lib/services/video-database-service';

const videoDatabaseService = new VideoDatabaseService();

export async function GET() {
  try {
    console.log('Fetching filter options...');

    // Get actual filter options from the database service
    const filterOptions = await videoDatabaseService.getFilterOptions();

    console.log(`Filter options loaded: ${filterOptions.sources.length} sources, ${filterOptions.categories.length} categories`);

    return NextResponse.json(filterOptions);

  } catch (error) {
    console.error('Error getting filter options:', error);

    return NextResponse.json(
      {
        error: 'Failed to get filter options',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}