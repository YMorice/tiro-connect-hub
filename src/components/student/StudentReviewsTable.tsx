
import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  
  const fetchReviews = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      let reviewsData: Review[] = [];
      
      if ((user as any).role === 'entrepreneur') {
        // Get entrepreneur reviews with all related data in one query
        const { data: entrepreneurData, error: entrepreneurError } = await supabase
          .from('entrepreneurs')
          .select(`
            id_entrepreneur,
            reviews (
              id,
              student_id,
              entrepreneur_id,
              project_id,
              rating,
              comment,
              created_at,
              students (
                id_student,
                users!inner(name)
              ),
              projects (
                title
              )
            )
          `)
          .eq('id_user', user.id)
          .single();
          
        if (entrepreneurError) {
          console.error('Erreur lors de la récupération des avis entrepreneur:', entrepreneurError);
          return;
        }
        
        if (entrepreneurData?.reviews) {
          reviewsData = entrepreneurData.reviews.map((review: any) => ({
            ...review,
            student_name: review.students?.users?.name || 'Étudiant inconnu',
            project_title: review.projects?.title || 'Projet inconnu'
          }));
        }
      } else if ((user as any).role === 'student') {
        // Get student reviews with all related data in one query
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(`
            id_student,
            reviews (
              id,
              student_id,
              entrepreneur_id,
              project_id,
              rating,
              comment,
              created_at,
              entrepreneurs (
                id_entrepreneur,
                users!inner(name)
              ),
              projects (
                title
              )
            )
          `)
          .eq('id_user', user.id)
          .single();
          
        if (studentError) {
          console.error('Erreur lors de la récupération des avis étudiant:', studentError);
          return;
        }
        
        if (studentData?.reviews) {
          reviewsData = studentData.reviews.map((review: any) => ({
            ...review,
            entrepreneur_name: review.entrepreneurs?.users?.name || 'Entrepreneur inconnu',
            project_title: review.projects?.title || 'Projet inconnu'
          }));
        }
      } else if ((user as any).role === 'admin') {
        // Admin sees all reviews with related data
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            *,
            students (
              id_student,
              users!inner(name)
            ),
            entrepreneurs (
              id_entrepreneur,
              users!inner(name)
            ),
            projects (
              title
            )
          `);
        
        if (error) {
          console.error('Erreur lors de la récupération des avis admin:', error);
          return;
        }
        
        if (data) {
          reviewsData = data.map((review: any) => ({
            ...review,
            student_name: review.students?.users?.name || 'Étudiant inconnu',
            entrepreneur_name: review.entrepreneurs?.users?.name || 'Entrepreneur inconnu',
            project_title: review.projects?.title || 'Projet inconnu'
          }));
        }
      }
      
      setReviews(reviewsData);
    } catch (error) {
      console.error("Erreur lors de la récupération des avis:", error);
      toast.error("Échec du chargement des avis");
    } finally {
      setLoading(false);
    }
  }, [user?.id, (user as any)?.role]);
  
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);
  
  // Memoize the table headers based on user role
  const tableHeaders = useMemo(() => {
    if ((user as any)?.role === 'student') {
      return ['Entrepreneur', 'Projet', 'Note', 'Commentaire', 'Date'];
    } else {
      return ['Étudiant', 'Projet', 'Note', 'Commentaire', 'Date'];
    }
  }, [(user as any)?.role]);
  
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
        Aucun avis trouvé.
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
              {(user as any)?.role === 'student' 
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
              {new Date(review.created_at).toLocaleDateString('fr-FR')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default StudentReviewsTable;
