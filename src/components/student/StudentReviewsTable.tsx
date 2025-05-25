
import React, { useEffect, useState, useMemo } from "react";
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
  entrepreneur_name?: string;
  project_title?: string;
}

export const StudentReviewsTable = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchReviews = async () => {
      setLoading(true);
      try {
        let reviewsData: Review[] = [];
        
        if (user.role === 'entrepreneur') {
          // Fetch reviews given by this entrepreneur with all related data in one query
          const { data: entrepreneurData } = await supabase
            .from('entrepreneurs')
            .select('id_entrepreneur')
            .eq('id_user', user.id)
            .single();
            
          if (!entrepreneurData) return;
          
          const { data, error } = await supabase
            .from('reviews')
            .select(`
              *,
              students!inner(
                id_student,
                users!inner(name)
              ),
              projects!inner(title)
            `)
            .eq('entrepreneur_id', entrepreneurData.id_entrepreneur);
            
          if (error) throw error;
          
          if (data) {
            reviewsData = data.map(review => ({
              ...review,
              student_name: (review.students as any)?.users?.name || 'Unknown Student',
              project_title: (review.projects as any)?.title || 'Unknown Project'
            }));
          }
        } else if (user.role === 'student') {
          // Fetch reviews about this student with all related data in one query
          const { data: studentData } = await supabase
            .from('students')
            .select('id_student')
            .eq('id_user', user.id)
            .single();
            
          if (!studentData) return;
          
          const { data, error } = await supabase
            .from('reviews')
            .select(`
              *,
              entrepreneurs!inner(
                id_entrepreneur,
                users!inner(name)
              ),
              projects!inner(title)
            `)
            .eq('student_id', studentData.id_student);
            
          if (error) throw error;
          
          if (data) {
            reviewsData = data.map(review => ({
              ...review,
              entrepreneur_name: (review.entrepreneurs as any)?.users?.name || 'Unknown Entrepreneur',
              project_title: (review.projects as any)?.title || 'Unknown Project'
            }));
          }
        } else if (user.role === 'admin') {
          // Admin sees all reviews with all related data in one query
          const { data, error } = await supabase
            .from('reviews')
            .select(`
              *,
              students!inner(
                id_student,
                users!inner(name)
              ),
              projects!inner(title)
            `);
          
          if (error) throw error;
          
          if (data) {
            reviewsData = data.map(review => ({
              ...review,
              student_name: (review.students as any)?.users?.name || 'Unknown Student',
              project_title: (review.projects as any)?.title || 'Unknown Project'
            }));
          }
        }
        
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        toast.error("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviews();
  }, [user?.id, user?.role]); // Only depend on essential values
  
  // Memoize the table headers based on user role
  const tableHeaders = useMemo(() => {
    if (user?.role === 'student') {
      return ['Entrepreneur', 'Project', 'Rating', 'Comment', 'Date'];
    } else {
      return ['Student', 'Project', 'Rating', 'Comment', 'Date'];
    }
  }, [user?.role]);
  
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
          {tableHeaders.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {reviews.map((review) => (
          <TableRow key={review.id}>
            <TableCell className="font-medium">
              {user?.role === 'student' 
                ? review.entrepreneur_name 
                : review.student_name}
            </TableCell>
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
