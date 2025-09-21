
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

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

    // Initialize Stripe - use production key
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Initialize Resend for email sending
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get payment intent from Stripe with error handling
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log("Payment intent retrieved successfully:", paymentIntent.status);
    } catch (stripeError) {
      console.error("Error retrieving payment intent from Stripe:", stripeError);
      throw new Error(`Payment intent not found: ${paymentIntentId}`);
    }
    
    if (!paymentIntent.metadata.project_id) {
      throw new Error("Invalid payment intent: no project ID");
    }

    const projectId = paymentIntent.metadata.project_id;
    console.log("Processing payment for project:", projectId);

    // Get project details with entrepreneur info
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select(`
        *,
        entrepreneurs!inner (
          id_entrepreneur,
          company_name,
          address,
          company_siret,
          id_user
        )
      `)
      .eq("id_project", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project not found:", projectError);
      throw new Error("Project not found");
    }

    // Get user info separately
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("email, name, surname")
      .eq("id_users", project.entrepreneurs.id_user)
      .single();

    if (userError || !userData) {
      console.error("User not found:", userError);
      throw new Error("User not found");
    }

    // If payment succeeded, update project status and create invoice
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

      // Call n8n webhook with project and entrepreneur data
      const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_LINK_PAYMENT");
      if (n8nWebhookUrl) {
        try {
          const webhookData = {
            event: "payment_confirmed",
            project: {
              id: project.id_project,
              title: project.title,
              description: project.description,
              price: project.price,
              deadline: project.deadline,
              devis: project.devis,
              created_at: project.created_at,
              updated_at: new Date().toISOString(),
            },
            entrepreneur: {
              id: project.entrepreneurs.id_entrepreneur,
              company_name: project.entrepreneurs.company_name,
              company_siret: project.entrepreneurs.company_siret,
              address: project.entrepreneurs.address,
            },
            user: {
              email: userData.email,
              name: userData.name,
              surname: userData.surname,
            },
            payment: {
              intent_id: paymentIntentId,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              status: paymentIntent.status,
            },
          };

          const response = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookData),
          });

          if (response.ok) {
            console.log("n8n webhook called successfully");
          } else {
            console.error("n8n webhook failed:", response.status, await response.text());
          }
        } catch (webhookError) {
          console.error("Error calling n8n webhook:", webhookError);
          // Don't fail the payment confirmation if webhook fails
        }
      } else {
        console.warn("N8N_WEBHOOK_LINK_PAYMENT not configured");
      }

      // Create Stripe customer if doesn't exist
      let customerId = paymentIntent.customer as string;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userData.email,
          name: `${userData.name} ${userData.surname}`,
          metadata: {
            entrepreneur_id: project.entrepreneurs.id_entrepreneur,
            company_name: project.entrepreneurs.company_name || "",
          },
        });
        customerId = customer.id;
      }

      // Create invoice after successful payment
      try {
        console.log("Creating Stripe invoice for successful payment");

        // Create invoice item
        const invoiceItem = await stripe.invoiceItems.create({
          customer: customerId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          description: `Paiement pour le projet: ${project.title}`,
          metadata: {
            project_id: projectId,
            payment_intent_id: paymentIntentId,
          },
        });

        // Create and finalize invoice
        const invoice = await stripe.invoices.create({
          customer: customerId,
          collection_method: "send_invoice",
          days_until_due: 30,
          metadata: {
            project_id: projectId,
            payment_intent_id: paymentIntentId,
          },
          footer: "Facture générée automatiquement après paiement réussi.",
        });

        // Mark invoice as paid since payment was already processed
        await stripe.invoices.pay(invoice.id, {
          paid_out_of_band: true,
        });

        console.log("Invoice created and marked as paid:", invoice.id);

        // Send invoice by email
        if (resend && userData.email) {
          try {
            // Get invoice PDF
            const invoicePdf = await stripe.invoices.retrievePdf(invoice.id);
            
            await resend.emails.send({
              from: "Tiro Connect <noreply@tiro-connect.com>",
              to: [userData.email],
              subject: `Facture pour votre projet: ${project.title}`,
              html: `
                <h2>Facture pour votre projet</h2>
                <p>Bonjour ${userData.name},</p>
                <p>Votre paiement pour le projet "<strong>${project.title}</strong>" a été traité avec succès.</p>
                <p>Vous trouverez en pièce jointe la facture correspondante.</p>
                <p><strong>Détails de la transaction :</strong></p>
                <ul>
                  <li>Montant : ${(paymentIntent.amount / 100).toFixed(2)} €</li>
                  <li>Numéro de facture : ${invoice.number}</li>
                  <li>Date : ${new Date().toLocaleDateString('fr-FR')}</li>
                </ul>
                <p>Cordialement,<br>L'équipe Tiro Connect</p>
              `,
              attachments: [
                {
                  filename: `facture-${invoice.number}.pdf`,
                  content: invoicePdf,
                  type: 'application/pdf',
                }
              ],
            });

            console.log("Invoice email sent successfully");
          } catch (emailError) {
            console.error("Error sending invoice email:", emailError);
            // Don't fail the whole operation if email fails
          }
        }

      } catch (invoiceError) {
        console.error("Error creating invoice:", invoiceError);
        // Don't fail the payment confirmation if invoice creation fails
      }

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
