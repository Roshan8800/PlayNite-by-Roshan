'use server';

/**
 * @fileOverview AI-powered content translation flow.
 *
 * - aiContentTranslation - A function that translates video content into a specified language.
 * - AIContentTranslationInput - The input type for the aiContentTranslation function.
 * - AIContentTranslationOutput - The return type for the aiContentTranslation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIContentTranslationInputSchema = z.object({
  videoContent: z.string().describe('The video content to be translated.'),
  targetLanguage: z.string().describe('The target language for translation.'),
});
export type AIContentTranslationInput = z.infer<typeof AIContentTranslationInputSchema>;

const AIContentTranslationOutputSchema = z.object({
  translatedContent: z.string().describe('The translated video content.'),
});
export type AIContentTranslationOutput = z.infer<typeof AIContentTranslationOutputSchema>;

export async function aiContentTranslation(input: AIContentTranslationInput): Promise<AIContentTranslationOutput> {
  return aiContentTranslationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiContentTranslationPrompt',
  input: {schema: AIContentTranslationInputSchema},
  output: {schema: AIContentTranslationOutputSchema},
  prompt: `You are an expert translator specializing in video content.

Translate the following video content into the target language.

Video Content: {{{videoContent}}}
Target Language: {{{targetLanguage}}}

Translated Content:`, // Removed triple braces
});

const aiContentTranslationFlow = ai.defineFlow(
  {
    name: 'aiContentTranslationFlow',
    inputSchema: AIContentTranslationInputSchema,
    outputSchema: AIContentTranslationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {translatedContent: output!};
  }
);
