'use server';
/**
 * @fileOverview An AI-powered personalized video recommendation agent.
 *
 * - getVideoRecommendations - A function that generates personalized video recommendations.
 * - VideoRecommendationsInput - The input type for the getVideoRecommendations function.
 * - VideoRecommendationsOutput - The return type for the getVideoRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { personalizationEngine } from '@/lib/behaviors/engines/PersonalizationEngine';
import { smartInteractionEngine } from '@/lib/behaviors/engines/SmartInteractionEngine';
import { UserBehavior, SmartInteractionContext } from '@/lib/behaviors/types';

const VideoRecommendationsInputSchema = z.object({
   userId: z
     .string()
     .describe('The unique identifier for the user.'),
   viewingHistory: z
     .string()
     .describe('The viewing history of the user as a string.'),
   preferences: z
     .string()
     .describe('The preferences of the user as a string.'),
   context: z
     .object({
       currentPage: z.string(),
       sessionId: z.string(),
       userAgent: z.string(),
       timestamp: z.date(),
       environment: z.object({
         deviceType: z.string(),
         browser: z.string(),
         platform: z.string()
       })
     })
     .optional()
     .describe('Additional context information for better recommendations.'),
   includeBehavioralData: z
     .boolean()
     .default(true)
     .describe('Whether to include behavioral data in recommendations.'),
 });
export type VideoRecommendationsInput = z.infer<typeof VideoRecommendationsInputSchema>;

const VideoRecommendationsOutputSchema = z.object({
  recommendations: z
    .string()
    .describe('Personalized video recommendations based on viewing history and preferences.'),
});
export type VideoRecommendationsOutput = z.infer<typeof VideoRecommendationsOutputSchema>;

export async function getVideoRecommendations(input: VideoRecommendationsInput): Promise<VideoRecommendationsOutput> {
   try {
     // Get user personalization profile if behavioral data is requested
     let behavioralInsights = '';
     let personalizedPreferences = '';

     if (input.includeBehavioralData && input.userId) {
       try {
         // Get personalization profile
         const profileResult = await personalizationEngine.getUserProfile(input.userId);
         if (profileResult.success && profileResult.data) {
           const profile = profileResult.data;

           // Extract behavioral insights
           behavioralInsights = `
Behavioral Patterns:
- Content Categories: ${profile.contentPreferences.categories.join(', ') || 'Not specified'}
- Preferred Tags: ${profile.contentPreferences.tags.join(', ') || 'Not specified'}
- UI Layout Preference: ${profile.uiPreferences.layout}
- Theme Preference: ${profile.uiPreferences.theme}
- Engagement Patterns: ${profile.behaviorPatterns.map(p => `${p.patternType}(${p.confidence.toFixed(2)})`).join(', ')}

User Preferences:
- Interaction Style: ${profile.preferences.interactionStyles.join(', ')}
- Notification Settings: ${JSON.stringify(profile.preferences.notificationSettings)}
- Accessibility: ${JSON.stringify(profile.preferences.accessibility)}
`;

           // Enhance preferences with behavioral data
           personalizedPreferences = `
Based on user behavior analysis:
- Content preferences: ${profile.contentPreferences.categories.join(', ') || 'diverse'}
- Quality preferences: ${profile.contentPreferences.qualityPreferences.join(', ')}
- Excluded content: ${profile.contentPreferences.excludedCategories.join(', ') || 'none'}
- UI preferences: ${profile.uiPreferences.layout} layout, ${profile.uiPreferences.theme} theme
- Engagement level: ${profile.behaviorPatterns.find(p => p.patternType === 'engagement')?.confidence || 'medium'}
`;
         }
       } catch (error) {
         console.warn('Failed to fetch behavioral data:', error);
       }
     }

     // Create enhanced context for AI
     const enhancedContext = {
       ...input,
       behavioralInsights,
       personalizedPreferences,
       recommendationStrategy: input.includeBehavioralData ?
         'Use behavioral patterns and personalization data to enhance recommendations' :
         'Standard recommendation approach'
     };

     return videoRecommendationsFlow(enhancedContext);
   } catch (error) {
     console.error('Error in enhanced video recommendations:', error);
     // Fallback to original flow
     return videoRecommendationsFlow(input);
   }
 }

const prompt = ai.definePrompt({
   name: 'videoRecommendationsPrompt',
   input: {schema: VideoRecommendationsInputSchema},
   output: {schema: VideoRecommendationsOutputSchema},
   prompt: `You are an AI video recommendation expert with access to advanced behavioral analysis and personalization data. Provide highly personalized video recommendations based on the user's complete profile.

USER PROFILE:
Viewing History: {{{viewingHistory}}}
Stated Preferences: {{{preferences}}}

{{#behavioralInsights}}
BEHAVIORAL ANALYSIS:
{{{behavioralInsights}}}

PERSONALIZATION DATA:
{{{personalizedPreferences}}}

RECOMMENDATION STRATEGY:
{{{recommendationStrategy}}}
{{/behavioralInsights}}

{{^behavioralInsights}}
RECOMMENDATION STRATEGY:
{{{recommendationStrategy}}}
{{/behavioralInsights}}

RECOMMENDATION GUIDELINES:
1. Consider behavioral patterns and engagement history
2. Adapt to user's content preferences and excluded categories
3. Factor in UI preferences and interaction styles
4. Prioritize content that matches user's engagement patterns
5. Diversify recommendations while maintaining relevance
6. Consider contextual factors like time of day and device type
7. Boost recommendations that align with user's quality preferences
8. Avoid excluded content types and categories

Generate 5-10 specific, actionable recommendations that leverage all available user data for maximum personalization.

Recommendations (provide detailed reasoning for each):`,
   model: 'googleai/gemini-2.5-flash',
 });

const videoRecommendationsFlow = ai.defineFlow(
  {
    name: 'videoRecommendationsFlow',
    inputSchema: VideoRecommendationsInputSchema,
    outputSchema: VideoRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
