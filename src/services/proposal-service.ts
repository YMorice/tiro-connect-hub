
import { supabase } from "@/integrations/supabase/client";

export const getStudentProposals = async (studentId: string) => {
  const { data, error } = await supabase
    .from("proposal_to_student")
    .select(`
      id_proposal,
      accepted,
      created_at,
      projects (
        id_project,
        title,
        description,
        status,
        created_at,
        updated_at,
        deadline,
        price,
        id_entrepreneur,
        selected_student,
        entrepreneurs (
          users (name, surname)
        )
      )
    `)
    .eq("id_student", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching student proposals:", error);
    throw error;
  }

  return data || [];
};
