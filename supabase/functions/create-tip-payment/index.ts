import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TIP-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get request body
    const { projectId, amount, studentName } = await req.json();
    logStep("Request data received", { projectId, amount, studentName });

    if (!projectId || !amount || amount <= 0) {
      throw new Error("Project ID and valid amount are required");
    }

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Verify user is entrepreneur and owns the project
    const { data: projectData, error: projectError } = await supabaseClient
      .from('projects')
      .select(`
        id_project,
        title,
        entrepreneurs!inner(
          id_user,
          users!inner(
            name,
            email
          )
        )
      `)
      .eq('id_project', projectId)
      .single();

    if (projectError || !projectData) {
      throw new Error("Project not found or access denied");
    }

    if (projectData.entrepreneurs.id_user !== user.id) {
      throw new Error("Only the project owner can send tips");
    }

    logStep("Project ownership verified", { projectTitle: projectData.title });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      logStep("No existing Stripe customer found");
    }

    // Create a one-time payment session for the tip
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: `Pourboire pour ${studentName || 'l\'étudiant'}`,
              description: `Pourboire pour le projet: ${projectData.title}`
            },
            unit_amount: Math.round(amount * 100), // Convert euros to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/projects/${projectId}?tip_success=true`,
      cancel_url: `${req.headers.get("origin")}/projects/${projectId}?tip_cancelled=true`,
      metadata: {
        type: "tip",
        project_id: projectId,
        entrepreneur_id: user.id,
        amount: amount.toString()
      }
    });

    logStep("Stripe checkout session created", { sessionId: session.id, url: session.url });

    // Optional: Log the tip attempt in database
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // You could create a tips table to track tip payments if needed
    // For now, we'll just log it
    logStep("Tip payment session created successfully");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-tip-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});