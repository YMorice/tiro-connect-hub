
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "@/components/ui/sonner";
import ReviewForm from "./ReviewForm";

/**
 * Props interface for the ProjectReviewSection component
 */
interface ProjectReviewSectionProps {
  /** ID of the project being reviewed */
  projectId: string;
  /** ID of the student being reviewed */
  studentId: string;
  /** Current status of the project (determines visibility) */
  projectStatus: string;
}

/**
 * Interface for review data structure
 * Represents a review stored in the database
 */
interface Review {
  /** Unique identifier for the review */
  id: string;
  /** Star rating from 1-5 */
  rating: number;
  /** Written comment/feedback */
  comment: string;
  /** Timestamp when the review was created */
  created_at: string;
}

/**
 * ProjectReviewSection Component
 * 
 * Main component that handles the display and management of project reviews
 * 
 * @param projectId - ID of the project being reviewed
 * @param studentId - ID of the student being reviewed  
 * @param projectStatus - Current status of the project
 */
const ProjectReviewSection: React.FC<ProjectReviewSectionProps> = ({
  projectId,
  studentId,
  projectStatus
}) => {
  const { user } = useAuth();
  
  // State management
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine visibility and permissions
  const isProjectCompleted = projectStatus.toLowerCase() === 'completed';
  const isEntrepreneur = (user as any)?.role === 'entrepreneur';

  // Fetch existing review when component mounts (if user is entrepreneur)
  useEffect(() => {
    if (isEntrepreneur && user) {
      fetchExistingReview();
    }
  }, [isEntrepreneur, user, projectId, studentId]);

  /**
   * Fetches any existing review from the current entrepreneur for this project/student pair
   * 
   * This function:
   * 1. Gets the entrepreneur ID for the current user
   * 2. Searches for an existing review matching the project, entrepreneur, and student
   * 3. Updates the component state with the result
   */
  const fetchExistingReview = async () => {
    if (!user) return;

    try {
      // Get the entrepreneur ID for the current user
      const { data: entrepreneurData, error: entrepreneurError } = await supabase
        .from('entrepreneurs')
        .select('id_entrepreneur')
        .eq('id_user', user.id)
        .single();

      if (entrepreneurError) throw entrepreneurError;

      // Search for existing review
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .eq('project_id', projectId)
        .eq('entrepreneur_id', entrepreneurData.id_entrepreneur)
        .eq('student_id', studentId)
        .maybeSingle();

      if (reviewError) throw reviewError;

      setExistingReview(reviewData);
    } catch (error: any) {
      console.error("Error fetching review:", error);
      // Don't show error toast for review fetch failures
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles successful review submission
   * Hides the form and refreshes the existing review data
   */
  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    fetchExistingReview();
  };

  // Don't render if user doesn't have permission or project isn't completed
  if (!isEntrepreneur || !isProjectCompleted || loading) {
    return null;
  }

  return (
    <div className="mt-6 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-4">Student Review</h3>
      
      {existingReview ? (
        /* Display existing review */
        <div className="space-y-2">
          {/* Star rating display */}
          <div className="flex items-center space-x-2">
            <span className="font-medium">Your Rating:</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= existingReview.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Review comment */}
          <div>
            <span className="font-medium">Your Comment:</span>
            <p className="text-gray-700 mt-1">{existingReview.comment}</p>
          </div>
          
          {/* Review submission date */}
          <p className="text-sm text-gray-500">
            Reviewed on {new Date(existingReview.created_at).toLocaleDateString()}
          </p>
        </div>
      ) : (
        /* Show review form or prompt to write review */
        <div>
          {showReviewForm ? (
            /* Review submission form */
            <ReviewForm
              projectId={projectId}
              studentId={studentId}
              onReviewSubmitted={handleReviewSubmitted}
              onCancel={() => setShowReviewForm(false)}
            />
          ) : (
            /* Prompt to write a review */
            <div>
              <p className="text-gray-600 mb-3">
                Share your experience working with this student by leaving a review.
              </p>
              <Button 
                onClick={() => setShowReviewForm(true)}
                className="bg-tiro-primary hover:bg-tiro-primary/90"
              >
                Write a Review
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectReviewSection;
