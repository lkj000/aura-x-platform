import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * useFeedback Hook
 * 
 * Connects UI rating components to the community feedback system for AI-native learning loop.
 * This hook enables the "Ground Truth" data collection that drives continuous model improvement.
 * 
 * Usage:
 * ```tsx
 * const { submitFeedback, isSubmitting } = useFeedback();
 * 
 * await submitFeedback({
 *   generationId: 123,
 *   culturalAuthenticityRating: 5,
 *   rhythmicSwingRating: 4,
 *   textFeedback: "Perfect Gauteng swing!"
 * });
 * ```
 */

export interface FeedbackInput {
  generationId: number;
  
  // Subjective Cultural Ratings (1-5 scale)
  culturalAuthenticityRating?: number;
  rhythmicSwingRating?: number;
  linguisticAlignmentRating?: number;
  productionQualityRating?: number;
  creativityRating?: number;
  
  // Feedback Details
  isFavorite?: boolean;
  textFeedback?: string;
  feedbackTags?: string[];
}

export interface FeedbackStats {
  avgCulturalRating: number;
  avgSwingRating: number;
  totalFeedbackCount: number;
  favoriteRate: number;
}

export function useFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = trpc.useUtils();
  
  // Submit feedback mutation
  const submitFeedbackMutation = trpc.communityFeedback.submitFeedback.useMutation({
    onSuccess: () => {
      // Invalidate relevant queries to refresh UI
      utils.communityFeedback.getFeedback.invalidate();
      utils.communityFeedback.getStats.invalidate();
      utils.aiStudio.listGenerations.invalidate();
      
      toast.success('Thank you for your feedback!', {
        description: 'Your input helps improve the AI\'s cultural authenticity.'
      });
    },
    onError: (error: any) => {
      toast.error('Failed to submit feedback', {
        description: error.message
      });
    }
  });
  
  // Submit feedback function
  const submitFeedback = async (input: FeedbackInput) => {
    setIsSubmitting(true);
    try {
      // Ensure required ratings are present
      if (!input.culturalAuthenticityRating || !input.rhythmicSwingRating) {
        throw new Error('Cultural authenticity and rhythmic swing ratings are required');
      }
      
      await submitFeedbackMutation.mutateAsync({
        ...input,
        culturalAuthenticityRating: input.culturalAuthenticityRating,
        rhythmicSwingRating: input.rhythmicSwingRating,
        isFavorite: input.isFavorite || false,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Quick rating function (simplified for star ratings)
  const quickRate = async (generationId: number, rating: number) => {
    return submitFeedback({
      generationId,
      culturalAuthenticityRating: rating,
      rhythmicSwingRating: rating,
      productionQualityRating: rating,
    });
  };
  
  return {
    submitFeedback,
    quickRate,
    isSubmitting,
  };
}

/**
 * useFeedbackStats Hook
 * 
 * Retrieves aggregated feedback statistics for a generation or model version.
 * Used for displaying community consensus and model performance metrics.
 */
export function useFeedbackStats(generationId?: number) {
  const statsQuery = trpc.communityFeedback.getStats.useQuery(
    { generationId: generationId! },
    { enabled: !!generationId }
  );
  
  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    error: statsQuery.error,
  };
}

/**
 * useGenerationFeedback Hook
 * 
 * Retrieves all feedback for a specific generation.
 * Used for displaying community reviews and detailed feedback.
 */
export function useGenerationFeedback(generationId: number) {
  const feedbackQuery = trpc.communityFeedback.getFeedback.useQuery(
    { generationId },
    { enabled: !!generationId }
  );
  
  return {
    feedback: feedbackQuery.data || [],
    isLoading: feedbackQuery.isLoading,
    error: feedbackQuery.error,
  };
}

/**
 * useModelPerformance Hook
 * 
 * Retrieves model performance metrics over time for MLOps monitoring.
 * Used for detecting model drift and performance degradation.
 */
export function useModelPerformance(timeRange: '7d' | '30d' | '90d' = '30d') {
  const metricsQuery = trpc.communityFeedback.getModelPerformanceMetrics.useQuery(
    { timeRange }
  );
  
  return {
    metrics: metricsQuery.data || [],
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
  };
}
