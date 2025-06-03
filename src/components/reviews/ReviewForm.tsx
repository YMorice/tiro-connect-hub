
/**
 * Review Form Component
 * 
 * This component provides a user interface for entrepreneurs to submit reviews
 * for students they have worked with on completed projects.
 * 
 * Key Features:
 * - Interactive star rating system with hover effects
 * - Text area for detailed comments
 * - Form validation for rating and comment requirements
 * - Integration with Supabase for data persistence
 * - Loading states and error handling
 * - Accessible form controls with proper labeling
 * 
 * The component uses react-hook-form for form state management and validation,
 * and integrates with the authentication context to identify the reviewing entrepreneur.
 * 
 * Form Validation:
 * - Rating: Required (must select 1-5 stars)
 * - Comment: Required, minimum 10 characters
 * 
 * User Experience:
 * - Hover effects on stars for visual feedback
 * - Disabled submit button until form is valid
 * - Loading state during submission
 * - Success/error feedback via toast notifications
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "@/components/ui/sonner";

/**
 * Props interface for the ReviewForm component
 */
interface ReviewFormProps {
  /** ID of the project being reviewed */
  projectId: string;
  /** ID of the student being reviewed */
  studentId: string;
  /** Callback function called when review is successfully submitted */
  onReviewSubmitted: () => void;
  /** Callback function called when user cancels the review */
  onCancel: () => void;
}

/**
 * Interface for the form data structure
 */
interface ReviewFormData {
  /** Star rating from 1-5 */
  rating: number;
  /** Written comment/feedback */
  comment: string;
}

/**
 * ReviewForm Component
 * 
 * Renders a form for submitting student reviews with star rating and comments
 * 
 * @param projectId - ID of the project being reviewed
 * @param studentId - ID of the student being reviewed
 * @param onReviewSubmitted - Callback for successful submission
 * @param onCancel - Callback for form cancellation
 */
const ReviewForm: React.FC<ReviewFormProps> = ({ 
  projectId, 
  studentId, 
  onReviewSubmitted, 
  onCancel 
}) => {
  const { user } = useAuth();
  
  // State for star rating interaction
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form management with validation
  const { register, handleSubmit, formState: { errors } } = useForm<ReviewFormData>();

  /**
   * Handles form submission
   * 
   * This function:
   * 1. Validates that a rating has been selected
   * 2. Gets the entrepreneur ID for the current user
   * 3. Submits the review to the database
   * 4. Shows success/error feedback
   * 5. Calls the success callback if submission succeeds
   * 
   * @param data - Form data containing the comment
   */
  const onSubmit = async (data: ReviewFormData) => {
    if (!user || rating === 0) return;

    setIsSubmitting(true);
    try {
      // Get entrepreneur ID for the current user
      const { data: entrepreneurData, error: entrepreneurError } = await supabase
        .from('entrepreneurs')
        .select('id_entrepreneur')
        .eq('id_user', user.id)
        .single();

      if (entrepreneurError) throw entrepreneurError;

      // Submit the review to the database
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          project_id: projectId,
          entrepreneur_id: entrepreneurData.id_entrepreneur,
          student_id: studentId,
          rating: rating,
          comment: data.comment
        });

      if (reviewError) throw reviewError;

      // Show success feedback and call success callback
      toast.success("Review submitted successfully!");
      onReviewSubmitted();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <h3 className="font-semibold">Rate this student</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Star Rating Section */}
        <div>
          <Label>Rating</Label>
          <div className="flex space-x-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-6 w-6 cursor-pointer transition-colors ${
                  star <= (hoverRating || rating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              />
            ))}
          </div>
          {/* Rating validation error */}
          {rating === 0 && (
            <p className="text-sm text-red-500 mt-1">Please select a rating</p>
          )}
        </div>

        {/* Comment Section */}
        <div>
          <Label htmlFor="comment">Comment</Label>
          <Textarea
            id="comment"
            placeholder="Share your experience working with this student..."
            {...register("comment", { 
              required: "Comment is required",
              minLength: { value: 10, message: "Comment must be at least 10 characters" }
            })}
            className="mt-1"
          />
          {/* Comment validation errors */}
          {errors.comment && (
            <p className="text-sm text-red-500 mt-1">{errors.comment.message}</p>
          )}
        </div>

        {/* Form Action Buttons */}
        <div className="flex space-x-2">
          <Button 
            type="submit" 
            disabled={isSubmitting || rating === 0}
            className="bg-tiro-primary hover:bg-tiro-primary/90"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
