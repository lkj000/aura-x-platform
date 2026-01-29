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
  const submitFeedbackMutation = trpc.communityFeedback.submit.useMutation({
    onSuccess: () => {
      // Invalidate relevant queries to refresh UI
      utils.communityFeedback.getByGeneration.invalidate();
      utils.communityFeedback.getStats.invalidate();
      utils.aiStudio.listGenerations.invalidate();
      
      toast.success('Thank you for your feedback!', {
        description: 'Your input helps improve the AI\'s cultural authenticity.'
      });
    },
    onError: (error) => {
      toast.error('Failed to submit feedback', {
        description: error.message
      });
    }
  });
  
  // Toggle favorite mutation
  const toggleFavoriteMutation = trpc.communityFeedback.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.communityFeedback.getByGeneration.invalidate();
      utils.aiStudio.listGenerations.invalidate();
    }
  });
  
  // Submit feedback function
  const submitFeedback = async (input: FeedbackInput) => {
    setIsSubmitting(true);
    try {
      await submitFeedbackMutation.mutateAsync(input);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle favorite function
  const toggleFavorite = async (generationId: number) => {
    try {
      await toggleFavoriteMutation.mutateAsync({ generationId });
      return { success: true };
    } catch (error) {
      return { success: false, error };
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
    toggleFavorite,
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
export function useFeedbackStats(generationId?: number, modelVersion?: string) {
  const statsQuery = trpc.communityFeedback.getStats.useQuery(
    { generationId, modelVersion },
    { enabled: !!(generationId || modelVersion) }
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
  const feedbackQuery = trpc.communityFeedback.getByGeneration.useQuery(
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
export function useModelPerformance(modelVersion: string, days: number = 30) {
  const metricsQuery = trpc.communityFeedback.getModelPerformance.useQuery(
    { modelVersion, days },
    { enabled: !!modelVersion }
  );
  
  return {
    metrics: metricsQuery.data || [],
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
  };
}
