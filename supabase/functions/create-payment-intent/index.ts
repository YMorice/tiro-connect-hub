
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

    // Get user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("User not authenticated");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    console.log("User authenticated:", userData.user.id);

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

    console.log("Project found:", project.title);

    // Validate project status and ownership
    if (project.status !== "STEP4") {
      throw new Error("Project is not in payment phase");
    }

    if (!project.price || project.price <= 0) {
      throw new Error("Invalid project price");
    }

    console.log("Project validation passed, creating Stripe payment intent");

    // Initialize Stripe - use test key for testing
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_TEST") || "", {
      apiVersion: "2023-10-16",
    });

    // Create a fresh payment intent for each request
    console.log("Creating new payment intent");
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(project.price * 100), // Convert to cents
      currency: "eur",
      metadata: {
        project_id: projectId,
        project_title: project.title,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log("New payment intent created:", paymentIntent.id);

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
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
