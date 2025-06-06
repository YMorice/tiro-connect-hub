
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StudentReviewsSectionProps {
  studentId: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  project_title?: string;
  entrepreneur_name?: string;
}

const StudentReviewsSection: React.FC<StudentReviewsSectionProps> = ({ studentId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            projects(title),
            entrepreneurs(users(name, surname))
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Format the reviews
        const formattedReviews = (data || []).map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
          project_title: review.projects?.title,
          entrepreneur_name: review.entrepreneurs?.users 
            ? `${review.entrepreneurs.users.name} ${review.entrepreneurs.users.surname}`
            : undefined
        }));

        setReviews(formattedReviews);

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
      fetchReviews();
    }
  }, [studentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No reviews available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Reviews ({reviews.length})</span>
          {averageRating !== null && (
            <div className="flex items-center">
              <div className="flex mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(averageRating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{averageRating}/5</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4 space-y-2">
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
                    {review.entrepreneur_name && (
                      <p className="text-xs font-medium mt-1">
                        By: {review.entrepreneur_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                    {review.project_title && (
                      <p className="text-xs text-muted-foreground">
                        Project: {review.project_title}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm">{review.comment}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default StudentReviewsSection;
