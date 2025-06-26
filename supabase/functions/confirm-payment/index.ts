
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentIntentId } = await req.json();
    
    if (!paymentIntentId) {
      throw new Error("Payment Intent ID is required");
    }

    console.log("Confirming payment for intent:", paymentIntentId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent.metadata.project_id) {
      throw new Error("Invalid payment intent: no project ID");
    }

    const projectId = paymentIntent.metadata.project_id;
    console.log("Processing payment for project:", projectId);

    // Get project details
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id_project", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project not found:", projectError);
      throw new Error("Project not found");
    }

    // If payment succeeded, update project status to active
    if (paymentIntent.status === "succeeded") {
      const { error: updateError } = await supabaseAdmin
        .from("projects")
        .update({
          status: "STEP5", // Active
          updated_at: new Date().toISOString(),
        })
        .eq("id_project", projectId);

      if (updateError) {
        console.error("Error updating project:", updateError);
        throw new Error("Failed to update project status");
      }

      console.log(`Payment succeeded for project ${projectId}, moved to STEP5`);

      // If project has selected student, add student to message group
      if (project.selected_student) {
        try {
          // Get the message group for this project
          const { data: messageGroup } = await supabaseAdmin
            .from("message_groups")
            .select("id_group")
            .eq("id_project", projectId)
            .limit(1)
            .single();

          if (messageGroup) {
            // Get student's user ID
            const { data: studentData } = await supabaseAdmin
              .from("students")
              .select("id_user")
              .eq("id_student", project.selected_student)
              .single();

            if (studentData) {
              // Add student to message group
              await supabaseAdmin
                .from("message_groups")
                .insert({
                  id_group: messageGroup.id_group,
                  id_user: studentData.id_user,
                  id_project: projectId,
                })
                .onConflict("id_group,id_project")
                .ignoreDuplicates();

              console.log("Added student to message group");
            }
          }
        } catch (error) {
          console.error("Error adding student to message group:", error);
          // Don't fail the whole operation if this fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_status: paymentIntent.status,
        project_status: paymentIntent.status === "succeeded" ? "STEP5" : project.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error confirming payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
