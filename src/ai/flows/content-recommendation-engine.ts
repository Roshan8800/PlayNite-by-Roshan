'use server';
/**
 * @fileOverview A content recommendation AI agent.
 *
 * - recommendVideos - A function that handles the video recommendation process.
 * - RecommendVideosInput - The input type for the recommendVideos function.
 * - RecommendVideosOutput - The return type for the recommendVideos function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { personalizationEngine } from '@/lib/behaviors/engines/PersonalizationEngine';
import { smartInteractionEngine } from '@/lib/behaviors/engines/SmartInteractionEngine';
import { UserBehavior, SmartInteractionContext, RecommendationContext } from '@/lib/behaviors/types';

const RecommendVideosInputSchema = z.object({
   userId: z
     .string()
     .describe('The unique identifier for the user.'),
   viewingHistory: z
     .array(z.string())
     .describe('An array of video IDs representing the user viewing history.'),
   preferences: z
     .string()
     .describe('A string containing the user preferences.'),
   context: z
     .object({
       currentContent: z.string().optional(),
       context: z.enum(['browsing', 'watching', 'searching', 'social', 'discovery']),
       similarUsers: z.array(z.string()).optional(),
       trendingTopics: z.array(z.string()).optional(),
       metadata: z.record(z.any()).optional()
     })
     .optional()
     .describe('Contextual information for enhanced recommendations.'),
   includeBehavioralInsights: z
     .boolean()
     .default(true)
     .describe('Whether to include behavioral insights in recommendations.'),
 });
export type RecommendVideosInput = z.infer<typeof RecommendVideosInputSchema>;

const RecommendVideosOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('An array of video IDs representing the recommended videos.'),
});
export type RecommendVideosOutput = z.infer<typeof RecommendVideosOutputSchema>;

export async function recommendVideos(input: RecommendVideosInput): Promise<RecommendVideosOutput> {
   try {
     // Get behavioral insights if requested
     let behavioralContext = '';
     let personalizationData = '';

     if (input.includeBehavioralInsights && input.userId) {
       try {
         // Get personalization data
         const context: RecommendationContext = {
           userId: input.userId,
           currentContent: input.context?.currentContent,
           context: input.context?.context || 'browsing',
           preferences: {
             categories: [],
             tags: [],
             creators: [],
             excludedCategories: [],
             excludedTags: [],
             qualityPreferences: ['hd']
           },
           behaviorHistory: [],
           similarUsers: input.context?.similarUsers,
           trendingTopics: input.context?.trendingTopics,
           metadata: input.context?.metadata
         };

         const personalizedResult = await personalizationEngine.getPersonalizedContent(context);

         if (personalizedResult.success && personalizedResult.data) {
           personalizationData = personalizedResult.data.join(', ');
         }

         // Get user profile for additional insights
         const profileResult = await personalizationEngine.getUserProfile(input.userId);
         if (profileResult.success && profileResult.data) {
           const profile = profileResult.data;

           behavioralContext = `
User Behavior Profile:
- Content Categories: ${profile.contentPreferences.categories.join(', ') || 'Not specified'}
- Preferred Tags: ${profile.contentPreferences.tags.join(', ') || 'Not specified'}
- Excluded Categories: ${profile.contentPreferences.excludedCategories.join(', ') || 'None'}
- UI Layout: ${profile.uiPreferences.layout}
- Engagement Patterns: ${profile.behaviorPatterns.map(p => p.patternType).join(', ')}
- Profile Confidence: ${profile.confidence.toFixed(2)}
- Last Updated: ${profile.lastUpdated.toISOString()}
`;
         }
       } catch (error) {
         console.warn('Failed to fetch behavioral insights:', error);
       }
     }

     // Create enhanced input with behavioral data
     const enhancedInput = {
       ...input,
       behavioralContext,
       personalizationData,
       recommendationStrategy: input.includeBehavioralInsights ?
         'Use behavioral analysis and personalization data for enhanced recommendations' :
         'Standard recommendation approach based on history and preferences'
     };

     return recommendVideosFlow(enhancedInput);
   } catch (error) {
     console.error('Error in enhanced video recommendations:', error);
     // Fallback to original flow
     return recommendVideosFlow(input);
   }
 }

const prompt = ai.definePrompt({
   name: 'recommendVideosPrompt',
   input: {schema: RecommendVideosInputSchema},
   output: {schema: RecommendVideosOutputSchema},
   prompt: `You are an expert video recommendation system with advanced behavioral analysis capabilities. Provide highly personalized video recommendations based on comprehensive user data.

RECOMMENDATION INPUT:
Viewing History: {{{viewingHistory}}}
User Preferences: {{{preferences}}}

{{#behavioralContext}}
BEHAVIORAL ANALYSIS:
{{{behavioralContext}}}

PERSONALIZATION DATA:
{{{personalizationData}}}

RECOMMENDATION STRATEGY:
{{{recommendationStrategy}}}
{{/behavioralContext}}

{{^behavioralContext}}
RECOMMENDATION STRATEGY:
{{{recommendationStrategy}}}
{{/behavioralContext}}

RECOMMENDATION CRITERIA:
1. Analyze viewing patterns and engagement history
2. Consider user's content preferences and exclusions
3. Factor in behavioral patterns and interaction styles
4. Prioritize content matching user's category preferences
5. Avoid excluded categories and content types
6. Consider contextual factors (current content, trending topics)
7. Balance exploration with exploitation of known preferences
8. Account for user's engagement level and interaction patterns

{{#context}}
CURRENT CONTEXT:
- Current Content: {{{context.currentContent}}}
- Context Type: {{{context.context}}}
{{#context.similarUsers}}- Similar Users: {{{context.similarUsers}}}{{/context.similarUsers}}
{{#context.trendingTopics}}- Trending Topics: {{{context.trendingTopics}}}{{/context.trendingTopics}}
{{/context}}

Generate 5-8 specific video IDs that best match the user's profile and current context. Prioritize recommendations that align with behavioral insights and personalization data.

Recommended Video IDs:`,
   model: 'googleai/gemini-2.5-flash',
 });

const recommendVideosFlow = ai.defineFlow(
  {
    name: 'recommendVideosFlow',
    inputSchema: RecommendVideosInputSchema,
    outputSchema: RecommendVideosOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
