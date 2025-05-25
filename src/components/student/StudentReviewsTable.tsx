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
          // Get entrepreneur ID first
          const { data: entrepreneurData, error: entrepreneurError } = await supabase
            .from('entrepreneurs')
            .select('id_entrepreneur')
            .eq('id_user', user.id)
            .single();
            
          if (entrepreneurError) {
            console.error('Error fetching entrepreneur data:', entrepreneurError);
            setLoading(false);
            return;
          }
          
          if (entrepreneurData) {
            // Fetch reviews given by this entrepreneur
            const { data, error } = await supabase
              .from('reviews')
              .select('*')
              .eq('entrepreneur_id', entrepreneurData.id_entrepreneur);
              
            if (error) {
              console.error('Error fetching entrepreneur reviews:', error);
            } else if (data) {
              // Fetch additional data for each review
              const enrichedReviews = await Promise.all(
                data.map(async (review) => {
                  const [studentResult, projectResult] = await Promise.all([
                    supabase
                      .from('students')
                      .select(`
                        id_student,
                        users!inner(name)
                      `)
                      .eq('id_student', review.student_id)
                      .single(),
                    supabase
                      .from('projects')
                      .select('title')
                      .eq('id_project', review.project_id)
                      .single()
                  ]);
                  
                  return {
                    ...review,
                    student_name: (studentResult.data as any)?.users?.name || 'Unknown Student',
                    project_title: projectResult.data?.title || 'Unknown Project'
                  };
                })
              );
              
              reviewsData = enrichedReviews;
            }
          }
        } else if (user.role === 'student') {
          // Get student ID first
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('id_student')
            .eq('id_user', user.id)
            .single();
            
          if (studentError) {
            console.error('Error fetching student data:', studentError);
            setLoading(false);
            return;
          }
          
          if (studentData) {
            // Fetch reviews about this student
            const { data, error } = await supabase
              .from('reviews')
              .select('*')
              .eq('student_id', studentData.id_student);
              
            if (error) {
              console.error('Error fetching student reviews:', error);
            } else if (data) {
              // Fetch additional data for each review
              const enrichedReviews = await Promise.all(
                data.map(async (review) => {
                  const [entrepreneurResult, projectResult] = await Promise.all([
                    supabase
                      .from('entrepreneurs')
                      .select(`
                        id_entrepreneur,
                        users!inner(name)
                      `)
                      .eq('id_entrepreneur', review.entrepreneur_id)
                      .single(),
                    supabase
                      .from('projects')
                      .select('title')
                      .eq('id_project', review.project_id)
                      .single()
                  ]);
                  
                  return {
                    ...review,
                    entrepreneur_name: (entrepreneurResult.data as any)?.users?.name || 'Unknown Entrepreneur',
                    project_title: projectResult.data?.title || 'Unknown Project'
                  };
                })
              );
              
              reviewsData = enrichedReviews;
            }
          }
        } else if (user.role === 'admin') {
          // Admin sees all reviews
          const { data, error } = await supabase
            .from('reviews')
            .select('*');
          
          if (error) {
            console.error('Error fetching admin reviews:', error);
          } else if (data) {
            // Fetch additional data for each review
            const enrichedReviews = await Promise.all(
              data.map(async (review) => {
                const [studentResult, projectResult] = await Promise.all([
                  supabase
                    .from('students')
                    .select(`
                      id_student,
                      users!inner(name)
                    `)
                    .eq('id_student', review.student_id)
                    .single(),
                  supabase
                    .from('projects')
                    .select('title')
                    .eq('id_project', review.project_id)
                    .single()
                ]);
                
                return {
                  ...review,
                  student_name: (studentResult.data as any)?.users?.name || 'Unknown Student',
                  project_title: projectResult.data?.title || 'Unknown Project'
                };
              })
            );
            
            reviewsData = enrichedReviews;
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
  }, [user?.id, user?.role]);
  
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
