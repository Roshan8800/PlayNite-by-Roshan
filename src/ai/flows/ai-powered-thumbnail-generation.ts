'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating compelling thumbnails for videos using AI.
 *
 * @remarks
 *   It exports:
 *     - `generateAiThumbnail`: A function to generate AI-powered thumbnails.
 *     - `AiThumbnailInput`: The input type for the `generateAiThumbnail` function.
 *     - `AiThumbnailOutput`: The output type for the `generateAiThumbnail` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiThumbnailInputSchema = z.object({
  videoTitle: z.string().describe('The title of the video.'),
  videoDescription: z.string().describe('A brief description of the video content.'),
  videoPreviewFramesDataUri: z
    .string()
    .describe(
      'A data URI of a frame or multiple representative frames of the video, that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'      
    ),
});
export type AiThumbnailInput = z.infer<typeof AiThumbnailInputSchema>;

const AiThumbnailOutputSchema = z.object({
  thumbnailDataUri: z
    .string()
    .describe(
      'A data URI of the generated thumbnail image, that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'      
    ),
});
export type AiThumbnailOutput = z.infer<typeof AiThumbnailOutputSchema>;

export async function generateAiThumbnail(input: AiThumbnailInput): Promise<AiThumbnailOutput> {
  return aiPoweredThumbnailGenerationFlow(input);
}

const aiPoweredThumbnailPrompt = ai.definePrompt({
  name: 'aiPoweredThumbnailPrompt',
  input: {schema: AiThumbnailInputSchema},
  output: {schema: AiThumbnailOutputSchema},
  prompt: `You are an AI-powered thumbnail generator. You will generate a compelling thumbnail for a video based on its title, description, and preview frames.

Video Title: {{{videoTitle}}}
Video Description: {{{videoDescription}}}
Video Preview Frames: {{media url=videoPreviewFramesDataUri}}

Create a thumbnail that is visually appealing and accurately represents the video content. The thumbnail should entice viewers to click on the video.

Ensure that the thumbnail is high-quality and optimized for various screen sizes.

Output the thumbnail as a data URI.`, // correctly use data URI
});

const aiPoweredThumbnailGenerationFlow = ai.defineFlow(
  {
    name: 'aiPoweredThumbnailGenerationFlow',
    inputSchema: AiThumbnailInputSchema,
    outputSchema: AiThumbnailOutputSchema,
  },
  async input => {
    const {output} = await aiPoweredThumbnailPrompt(input);
    return output!;
  }
);
