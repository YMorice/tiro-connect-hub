
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
    const { projectId } = await req.json();
    
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    console.log("Creating payment intent for project:", projectId);

    // Initialize Supabase client with service role for secure operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    const user = userData.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log("User authenticated:", user.id);

    // Get project details and verify ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select(`
        id_project,
        title,
        price,
        status,
        id_entrepreneur,
        entrepreneurs (
          id_user
        )
      `)
      .eq("id_project", projectId)
      .single();

    if (projectError) {
      console.error("Project fetch error:", projectError);
      throw new Error(`Project fetch error: ${projectError.message}`);
    }

    if (!project) {
      console.error("Project not found for ID:", projectId);
      throw new Error("Project not found");
    }

    console.log("Project found:", project.title);

    // Verify user is the project owner
    if (project.entrepreneurs?.id_user !== user.id) {
      throw new Error("Unauthorized: You can only pay for your own projects");
    }

    // Verify project is in payment status
    if (project.status !== "STEP4") {
      throw new Error(`Project is not in payment phase. Current status: ${project.status}`);
    }

    if (!project.price || project.price <= 0) {
      throw new Error("Invalid project price");
    }

    console.log("Project validation passed, creating Stripe payment intent");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: project.price * 100, // Convert to cents
      currency: "eur",
      metadata: {
        project_id: project.id_project,
        project_title: project.title,
        user_id: user.id,
      },
    });

    console.log("Payment intent created:", paymentIntent.id);

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: project.price,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
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
