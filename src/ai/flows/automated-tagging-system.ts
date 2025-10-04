'use server';
/**
 * @fileOverview An automated tagging system that assigns relevant tags to videos based on content analysis.
 *
 * - automatedTaggingSystem - A function that handles the automated tagging process.
 * - AutomatedTaggingSystemInput - The input type for the automatedTaggingSystem function.
 * - AutomatedTaggingSystemOutput - The return type for the automatedTaggingSystem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomatedTaggingSystemInputSchema = z.object({
  videoTitle: z.string().describe('The title of the video.'),
  videoDescription: z.string().describe('The description of the video.'),
  videoTranscript: z.string().optional().describe('The transcript of the video, if available.'),
});
export type AutomatedTaggingSystemInput = z.infer<typeof AutomatedTaggingSystemInputSchema>;

const AutomatedTaggingSystemOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of relevant tags for the video.'),
});
export type AutomatedTaggingSystemOutput = z.infer<typeof AutomatedTaggingSystemOutputSchema>;

export async function automatedTaggingSystem(input: AutomatedTaggingSystemInput): Promise<AutomatedTaggingSystemOutput> {
  return automatedTaggingSystemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automatedTaggingSystemPrompt',
  input: {schema: AutomatedTaggingSystemInputSchema},
  output: {schema: AutomatedTaggingSystemOutputSchema},
  prompt: `You are an expert in video content analysis and tagging.

  Based on the video title, description, and transcript (if available), identify the most relevant tags for the video.
  The tags should be concise and accurately reflect the content of the video.

  Video Title: {{{videoTitle}}}
  Video Description: {{{videoDescription}}}
  Video Transcript: {{{videoTranscript}}}

  Return only an array of strings.
  `, 
});

const automatedTaggingSystemFlow = ai.defineFlow(
  {
    name: 'automatedTaggingSystemFlow',
    inputSchema: AutomatedTaggingSystemInputSchema,
    outputSchema: AutomatedTaggingSystemOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
