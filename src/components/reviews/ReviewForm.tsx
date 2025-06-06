
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "@/components/ui/sonner";

interface ReviewFormProps {
  projectId: string;
  studentId: string;
  onReviewSubmitted: () => void;
  onCancel: () => void;
}

interface ReviewFormData {
  rating: number;
  comment: string;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ 
  projectId, 
  studentId, 
  onReviewSubmitted, 
  onCancel 
}) => {
  const { user } = useAuth();
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ReviewFormData>();

  // Check for existing review on component mount
  useEffect(() => {
    checkExistingReview();
  }, [projectId, studentId, user]);

  const checkExistingReview = async () => {
    if (!user) return;

    try {
      const { data: entrepreneurData, error: entrepreneurError } = await supabase
        .from('entrepreneurs')
        .select('id_entrepreneur')
        .eq('id_user', user.id)
        .single();

      if (entrepreneurError) return;

      const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('project_id', projectId)
        .eq('entrepreneur_id', entrepreneurData.id_entrepreneur)
        .eq('student_id', studentId)
        .maybeSingle();

      if (checkError) return;

      if (existingReview) {
        setHasExistingReview(true);
        toast.error("You have already submitted a review for this student on this project");
        onCancel();
      }
    } catch (error) {
      console.error("Error checking existing review:", error);
    }
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (!user || rating === 0 || hasExistingReview) return;

    setIsSubmitting(true);
    try {
      const { data: entrepreneurData, error: entrepreneurError } = await supabase
        .from('entrepreneurs')
        .select('id_entrepreneur')
        .eq('id_user', user.id)
        .single();

      if (entrepreneurError) throw entrepreneurError;

      // Double check if a review already exists before inserting
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('project_id', projectId)
        .eq('entrepreneur_id', entrepreneurData.id_entrepreneur)
        .eq('student_id', studentId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingReview) {
        toast.error("You have already submitted a review for this student on this project");
        setHasExistingReview(true);
        onCancel();
        return;
      }

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

      toast.success("Review submitted successfully!");
      onReviewSubmitted();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasExistingReview) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <h3 className="font-semibold">Rate this student</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          {rating === 0 && (
            <p className="text-sm text-red-500 mt-1">Please select a rating</p>
          )}
        </div>

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
          {errors.comment && (
            <p className="text-sm text-red-500 mt-1">{errors.comment.message}</p>
          )}
        </div>

        <div className="flex space-x-2">
          <Button 
            type="submit" 
            disabled={isSubmitting || rating === 0 || hasExistingReview}
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
