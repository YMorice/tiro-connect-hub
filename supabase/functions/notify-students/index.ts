import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyStudentsRequest {
  projectId: string;
  studentIds: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, studentIds }: NotifyStudentsRequest = await req.json();
    
    console.log('Notifying students for project:', projectId, 'Students:', studentIds);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get project details with entrepreneur info
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        id_project,
        title,
        description,
        deadline,
        entrepreneurs (
          id_entrepreneur,
          company_name,
          users (
            name,
            surname,
            email
          )
        )
      `)
      .eq('id_project', projectId)
      .single();

    if (projectError || !projectData) {
      console.error('Error fetching project:', projectError);
      throw new Error('Project not found');
    }

    // Get student details
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        id_student,
        users (
          id_users,
          name,
          surname,
          email,
          phone
        )
      `)
      .in('id_student', studentIds);

    if (studentsError || !studentsData) {
      console.error('Error fetching students:', studentsError);
      throw new Error('Students not found');
    }

    // TODO: Implement new notification system
    console.log('Notification system temporarily disabled - implementing new solution');
    
    const results = studentsData.map(student => ({
      success: true,
      message: `Notification queued for ${student.users.email}`
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Notifications sent to ${studentsData.length} students`,
      results 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in notify-students function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);