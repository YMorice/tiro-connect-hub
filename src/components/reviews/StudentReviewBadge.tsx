
import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StudentReviewBadgeProps {
  studentId: string;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  project_title?: string;
}

const StudentReviewBadge: React.FC<StudentReviewBadgeProps> = ({ studentId }) => {
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviewStats = async () => {
      try {
        // Get all reviews for this student
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            projects(title)
          `)
          .eq('student_id', studentId);

        if (error) throw error;

        // Format the review data
        const formattedReviews = (data || []).map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
          project_title: review.projects?.title
        }));

        setReviews(formattedReviews);
        setReviewCount(formattedReviews.length);

        // Calculate average rating
        if (formattedReviews.length > 0) {
          const totalRating = formattedReviews.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating(parseFloat((totalRating / formattedReviews.length).toFixed(1)));
        }
      } catch (error) {
        console.error('Error fetching student reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchReviewStats();
    }
  }, [studentId]);

  if (loading) {
    return <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="h-3 w-3 animate-spin rounded-full border-b-2 border-muted-foreground"></span>
      <span>Loading reviews...</span>
    </div>;
  }

  // If no reviews, don't display anything
  if (reviewCount === 0) {
    return <div className="text-xs text-muted-foreground">No reviews yet</div>;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3 w-3 ${
                  star <= Math.round(averageRating || 0)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="ml-1 text-xs font-medium">
            {averageRating} ({reviewCount})
          </span>
        </div>
        
        <Button 
          variant="link" 
          size="sm" 
          className="p-0 h-auto text-xs text-tiro-primary"
          onClick={() => setShowAllReviews(true)}
        >
          View Reviews
        </Button>
      </div>

      <Dialog open={showAllReviews} onOpenChange={setShowAllReviews}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Student Reviews</DialogTitle>
            <DialogDescription>
              {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'} with an average rating of {averageRating}/5
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              {reviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      {review.project_title && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Project: {review.project_title}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentReviewBadge;
