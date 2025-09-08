import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, studentIds } = await req.json();

    if (!projectId || !studentIds || !Array.isArray(studentIds)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: projectId and studentIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Triggering n8n for project:', projectId, 'students:', studentIds);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        entrepreneurs(
          *,
          users!entrepreneurs_id_user_fkey(*)
        )
      `)
      .eq('id_project', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch student details with their user info
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        *,
        users!students_id_user_fkey(*)
      `)
      .in('id_student', studentIds);

    if (studentsError || !students) {
      console.error('Error fetching students:', studentsError);
      return new Response(
        JSON.stringify({ error: 'Students not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetched project:', project.title);
    console.log('Fetched students:', students.map(s => s.users?.name || 'Unknown'));

    // Prepare notification data for each student
    for (const student of students) {
      const notificationData = {
        trigger: 'student_proposal_notification',
        student: {
          id: student.id_student,
          name: student.users?.name,
          email: student.users?.email,
          specialty: student.specialty,
          skills: student.skills
        },
        project: {
          id: project.id_project,
          title: project.title,
          description: project.description,
          price: project.price,
          deadline: project.deadline
        },
        entrepreneur: {
          id: project.entrepreneurs?.id_entrepreneur,
          name: project.entrepreneurs?.users?.name,
          email: project.entrepreneurs?.users?.email,
          company: project.entrepreneurs?.company_name
        },
        timestamp: new Date().toISOString()
      };

      console.log('Sending to n8n for student:', student.users?.email);

      // Send to Redis/n8n trigger
      try {
        // You can either use Redis directly or make HTTP call to n8n webhook
        // For now, I'll use Redis to push the notification data
        const redisUrl = Deno.env.get('REDIS_URL');
        if (redisUrl) {
          // Push to Redis queue that n8n monitors
          const redisResponse = await fetch(`${redisUrl}/lpush/n8n_notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notificationData)
          });
          
          if (!redisResponse.ok) {
            console.error('Failed to push to Redis for student:', student.users?.email);
          } else {
            console.log('Successfully pushed to Redis for student:', student.users?.email);
          }
        }
      } catch (error) {
        console.error('Error sending to n8n for student:', student.users?.email, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Triggered n8n notifications for ${students.length} students`,
        projectTitle: project.title,
        studentCount: students.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trigger-n8n function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});