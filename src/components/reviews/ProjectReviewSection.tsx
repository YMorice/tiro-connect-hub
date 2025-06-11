
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "@/components/ui/sonner";
import ReviewForm from "./ReviewForm";

interface ProjectReviewSectionProps {
  projectId: string;
  studentId: string;
  projectStatus: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
}

const ProjectReviewSection: React.FC<ProjectReviewSectionProps> = ({
  projectId,
  studentId,
  projectStatus
}) => {
  const { user } = useAuth();
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  const isProjectCompleted = projectStatus.toLowerCase() === 'completed';
  const isEntrepreneur = (user as any)?.role === 'entrepreneur';

  useEffect(() => {
    if (isEntrepreneur && user && isProjectCompleted) {
      fetchExistingReview();
    } else {
      setLoading(false);
    }
  }, [isEntrepreneur, user, projectId, studentId, isProjectCompleted]);

  const fetchExistingReview = async () => {
    if (!user) return;

    try {
      const { data: entrepreneurData, error: entrepreneurError } = await supabase
        .from('entrepreneurs')
        .select('id_entrepreneur')
        .eq('id_user', user.id)
        .single();

      if (entrepreneurError) throw entrepreneurError;

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
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    fetchExistingReview();
  };

  if (!isEntrepreneur || !isProjectCompleted || loading) {
    return null;
  }

  return (
    <div className="mt-6 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-4">Student Review</h3>
      
      {existingReview ? (
        <div className="space-y-2">
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
          
          <div>
            <span className="font-medium">Your Comment:</span>
            <p className="text-gray-700 mt-1">{existingReview.comment}</p>
          </div>
          
          <p className="text-sm text-gray-500">
            Reviewed on {new Date(existingReview.created_at).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <div>
          {showReviewForm ? (
            <ReviewForm
              projectId={projectId}
              studentId={studentId}
              onReviewSubmitted={handleReviewSubmitted}
              onCancel={() => setShowReviewForm(false)}
            />
          ) : (
            <div>
              <p className="text-gray-600 mb-3">
                Partagez votre expérience avec cet étudiant en laissant un avis.
              </p>
              <Button 
                onClick={() => setShowReviewForm(true)}
                className="bg-tiro-primary hover:bg-tiro-primary/90"
              >
                Ecrire un avis
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectReviewSection;
