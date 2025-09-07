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

    const novuApiKey = Deno.env.get('NOVU_API_KEY');
    if (!novuApiKey) {
      throw new Error('NOVU_API_KEY not configured');
    }

    // Send notification to each student
    const notificationPromises = studentsData.map(async (student) => {
      const payload = {
        to: {
          subscriberId: student.users.id_users,
          email: student.users.email,
          firstName: student.users.name,
          lastName: student.users.surname,
        },
        name: 'project-proposed-to-student',
        payload: {
          projectTitle: projectData.title,
          projectDescription: projectData.description,
          projectDeadline: projectData.deadline,
          entrepreneurName: `${projectData.entrepreneurs.users.name} ${projectData.entrepreneurs.users.surname}`,
          companyName: projectData.entrepreneurs.company_name || 'Non spécifié',
          studentName: student.users.name,
          studentEmail: student.users.email,
          studentPhone: student.users.phone || 'Non renseigné',
          projectId: projectId,
        },
      };

      console.log('Sending notification to student:', student.users.email);

      const novuResponse = await fetch('https://api.novu.co/v1/events/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${novuApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!novuResponse.ok) {
        const errorText = await novuResponse.text();
        console.error(`Failed to send notification to ${student.users.email}:`, errorText);
        throw new Error(`Novu API error: ${novuResponse.status} - ${errorText}`);
      }

      const result = await novuResponse.json();
      console.log(`Notification sent successfully to ${student.users.email}:`, result);
      return result;
    });

    const results = await Promise.all(notificationPromises);

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