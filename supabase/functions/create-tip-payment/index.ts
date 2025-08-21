import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TIP-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { project_id, tip_amount } = await req.json();
    
    if (!project_id || !tip_amount) {
      throw new Error("Missing project_id or tip_amount");
    }

    if (tip_amount < 100 || tip_amount > 1000000) { // 1€ to 10,000€ in cents
      throw new Error("Invalid tip amount");
    }

    logStep("Request data", { project_id, tip_amount });

    // Verify user is the entrepreneur of this project  
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id_project, title, id_entrepreneur')
      .eq('id_project', project_id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Get the entrepreneur data to verify ownership
    const { data: entrepreneur, error: entrepreneurError } = await supabaseClient
      .from('entrepreneurs')
      .select('id_user')
      .eq('id_entrepreneur', project.id_entrepreneur)
      .single();

    if (entrepreneurError || !entrepreneur || entrepreneur.id_user !== user.id) {
      throw new Error("User not authorized for this project");
    }

    logStep("Project verified", { projectId: project.id_project, title: project.title });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    logStep("Customer check", { customerId, email: user.email });

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: tip_amount,
      currency: "eur",
      customer: customerId,
      metadata: {
        project_id: project_id,
        tip_amount: tip_amount.toString(),
        user_id: user.id,
        project_title: project.title,
      },
      description: `Pourboire - ${project.title}`,
    });

    logStep("Stripe payment intent created", { 
      paymentIntentId: paymentIntent.id, 
      clientSecret: paymentIntent.client_secret 
    });

    return new Response(JSON.stringify({ 
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id 
    }), {
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