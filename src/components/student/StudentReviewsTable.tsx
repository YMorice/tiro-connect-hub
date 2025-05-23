
import React, { useEffect, useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "@/components/ui/sonner";

interface Review {
  id: string;
  student_id: string;
  entrepreneur_id: string;
  project_id: string;
  rating: number;
  comment: string;
  created_at: string;
  student_name?: string;
  project_title?: string;
}

export const StudentReviewsTable = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        // Fetch different reviews based on user role
        if (!user) return;
        
        let query;
        
        if (user.role === 'entrepreneur') {
          // Entrepreneurs see reviews they've given
          const { data: entrepreneurData } = await supabase
            .from('entrepreneurs')
            .select('id_entrepreneur')
            .eq('id_user', user.id)
            .single();
            
          if (!entrepreneurData) return;
          
          query = supabase
            .from('reviews')
            .select(`
              *,
              students!inner(id_student, id_user),
              projects!inner(id_project, title)
            `)
            .eq('entrepreneur_id', entrepreneurData.id_entrepreneur);
        } else if (user.role === 'student') {
          // Students see reviews about them
          const { data: studentData } = await supabase
            .from('students')
            .select('id_student')
            .eq('id_user', user.id)
            .single();
            
          if (!studentData) return;
          
          query = supabase
            .from('reviews')
            .select(`
              *,
              entrepreneurs!inner(id_entrepreneur, id_user),
              projects!inner(id_project, title)
            `)
            .eq('student_id', studentData.id_student);
        } else {
          // Admin sees all reviews
          query = supabase
            .from('reviews')
            .select(`
              *,
              students!inner(id_student, id_user),
              entrepreneurs!inner(id_entrepreneur, id_user),
              projects!inner(id_project, title)
            `);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Transform data to include names
        if (data) {
          // Get user names from users table for each student and entrepreneur
          const reviewsWithNames = await Promise.all(
            data.map(async (review) => {
              // Fetch student name
              const { data: studentUserData } = await supabase
                .from('users')
                .select('name')
                .eq('id_users', review.students.id_user)
                .single();
              
              return {
                ...review,
                student_name: studentUserData?.name || 'Unknown Student',
                project_title: review.projects?.title || 'Unknown Project'
              };
            })
          );
          
          setReviews(reviewsWithNames);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
        toast.error("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviews();
  }, [user]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiro-primary"></div>
      </div>
    );
  }
  
  if (reviews.length === 0) {
    return (
      <p className="text-muted-foreground text-center p-4">
        No reviews found.
      </p>
    );
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reviews.map((review) => (
          <TableRow key={review.id}>
            <TableCell className="font-medium">{review.student_name}</TableCell>
            <TableCell>{review.project_title}</TableCell>
            <TableCell>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating 
                        ? "text-yellow-400 fill-yellow-400" 
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </TableCell>
            <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
            <TableCell>
              {new Date(review.created_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default StudentReviewsTable;
