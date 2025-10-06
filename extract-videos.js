// Script to extract videos from the large PornHub database
// Note: This is a simplified version for testing the database structure

async function main() {
  console.log('Starting video extraction from PornHub database...');

  try {
    // Create extractor with configuration
    const extractor = new VideoExtractor({
      maxVideos: 100, // Start with 100 videos for testing
      batchSize: 50,
      outputPath: './extracted-videos-sample.json',
      // Optional filters - remove these to extract all videos
      categories: ['Big Tits', 'Brunette', 'MILF'],
      sources: ['brazzers.com', 'cumbots.com']
    });

    console.log('Extraction configuration:', extractor.getExtractionStats());

    // Extract videos
    const result = await extractor.extractVideos();

    console.log('\n=== EXTRACTION COMPLETE ===');
    console.log(`Total videos extracted: ${result.videos.length}`);
    console.log(`Sources found: ${result.metadata.sources.length}`);
    console.log(`Categories found: ${result.metadata.categories.length}`);
    console.log(`Performers found: ${result.metadata.performers.length}`);
    console.log(`Output saved to: ${extractor.getExtractionStats().outputPath}`);

    // Show sample of extracted videos
    console.log('\n=== SAMPLE VIDEOS ===');
    result.videos.slice(0, 3).forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(`   Duration: ${video.duration}s, Views: ${video.viewCount.toLocaleString()}`);
      console.log(`   Categories: ${video.categories.join(', ')}`);
      console.log(`   Source: ${video.source}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error during extraction:', error);
    process.exit(1);
  }
}

// Run the extraction
main();