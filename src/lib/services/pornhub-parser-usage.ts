import { PornhubDataParser, PlayNiteContentStructure } from './pornhub-data-parser';
import { videoStreamingService } from './video-streaming-service';
import fs from 'fs';
import path from 'path';

/**
 * Example usage of the Pornhub CSV parser
 * This file demonstrates how to parse CSV data and integrate with video streaming
 */
export class PornhubParserExample {
  private parser: PornhubDataParser;

  constructor() {
    this.parser = new PornhubDataParser({
      batchSize: 100,
      maxRecords: 1000,
      includeSecondaryThumbnails: true
    });
  }

  /**
   * Parse CSV file and return structured data
   */
  async parseCSVFile(filePath: string): Promise<PlayNiteContentStructure> {
    try {
      console.log(`Parsing CSV file: ${filePath}`);

      // Read CSV file
      const csvContent = fs.readFileSync(filePath, 'utf-8');

      // Parse in batches for memory efficiency
      const allVideos = [];
      for await (const batch of this.parser.parseCSVInBatches(csvContent)) {
        console.log(`Parsed batch of ${batch.length} videos`);
        allVideos.push(...batch);
      }

      // Transform to PlayNite structure
      const result = this.parser.transformForPlayNite(allVideos);

      console.log(`Successfully parsed ${result.videos.length} videos`);
      console.log(`Found ${result.metadata.sources.length} sources`);
      console.log(`Found ${result.metadata.categories.length} categories`);
      console.log(`Found ${result.metadata.performers.length} performers`);

      return result;
    } catch (error) {
      console.error('Error parsing CSV file:', error);
      throw error;
    }
  }

  /**
   * Generate streaming manifest for a video
   */
  async generateVideoManifest(videoId: string, videoData: any) {
    try {
      const manifest = await videoStreamingService.generateStreamManifest(
        videoId,
        videoData.embedUrl,
        {
          title: videoData.title,
          description: `Video by ${videoData.performers.join(', ')}`,
          thumbnailUrl: videoData.primaryThumbnail
        }
      );

      console.log(`Generated streaming manifest for: ${videoData.title}`);
      return manifest;
    } catch (error) {
      console.error('Error generating video manifest:', error);
      throw error;
    }
  }

  /**
   * Process all videos from CSV and generate manifests
   */
  async processAllVideos(csvFilePath: string) {
    try {
      console.log('Starting video processing pipeline...');

      // Parse CSV data
      const csvData = await this.parseCSVFile(csvFilePath);

      // Process each video
      const processedVideos = [];
      for (const video of csvData.videos) {
        try {
          const manifest = await this.generateVideoManifest(video.videoId || `video-${Date.now()}`, video);
          processedVideos.push({
            ...video,
            streamingManifest: manifest
          });
        } catch (error) {
          console.error(`Failed to process video: ${video.title}`, error);
        }
      }

      console.log(`Successfully processed ${processedVideos.length} videos`);
      return processedVideos;
    } catch (error) {
      console.error('Error in video processing pipeline:', error);
      throw error;
    }
  }

  /**
   * Validate video data quality
   */
  validateVideoData(videos: any[]) {
    const validationResults = videos.map(video => {
      const validation = this.parser.validateVideo(video);
      return {
        title: video.title,
        isValid: validation.isValid,
        errors: validation.errors
      };
    });

    const validCount = validationResults.filter(v => v.isValid).length;
    const invalidCount = validationResults.length - validCount;

    console.log(`Validation Results:`);
    console.log(`✅ Valid videos: ${validCount}`);
    console.log(`❌ Invalid videos: ${invalidCount}`);

    if (invalidCount > 0) {
      console.log('\nInvalid videos:');
      validationResults
        .filter(v => !v.isValid)
        .forEach(v => {
          console.log(`- ${v.title}: ${v.errors.join(', ')}`);
        });
    }

    return validationResults;
  }
}

// Example usage function
export async function demonstrateCSVIntegration() {
  const example = new PornhubParserExample();

  try {
    // Path to sample CSV file
    const csvFilePath = path.join(__dirname, 'pornhub-videos-sample.csv');

    console.log('🚀 Starting CSV integration demonstration...\n');

    // Check if CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      console.log(`❌ CSV file not found: ${csvFilePath}`);
      console.log('Please ensure the CSV file exists in the services directory');
      return;
    }

    // Process all videos
    const processedVideos = await example.processAllVideos(csvFilePath);

    // Validate data quality
    example.validateVideoData(processedVideos);

    console.log('\n✅ CSV integration demonstration completed successfully!');
    console.log(`📊 Processed ${processedVideos.length} videos from CSV`);

    return processedVideos;

  } catch (error) {
    console.error('❌ CSV integration demonstration failed:', error);
    throw error;
  }
}

// Export for use in other modules
export default PornhubParserExample;