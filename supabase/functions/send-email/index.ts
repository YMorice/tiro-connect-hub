import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  groupId: string
  senderName: string
}

const generateMessageNotificationHTML = (senderName: string) => `
<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#F7FAFB;padding:30px 30px;">
  <div style="background:#ffffff;border-radius:8px;padding:30px 20px;box-shadow:0 2px 6px rgba(0,0,0,0.05);">
    
    <p style="font-size:18px;font-weight:bold;color:#121A21;margin-top:0;">Nouveau message sur Tiro</p>
    
    <p style="font-size:16px;line-height:1.6;color:#121A21;">
      ${senderName} vous a envoyé un nouveau message. Cliquez sur le bouton ci-dessous pour accéder à votre conversation :
    </p>
    
    <div style="text-align:center;margin:30px 0;">
      <a href="https://app.tiro.agency/messages" style="background-color:#E74C3C;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:5px;font-weight:bold;font-size:16px;display:inline-block;">
        Accéder à ma conversation
      </a>
    </div>
    
    <p style="font-size:13px;color:#777;margin-top:25px;">
      Ce message a été envoyé automatiquement, merci de ne pas y répondre directement.
    </p>
    
    <p style="margin-top:25px;font-size:15px;color:#121A21;">
      Merci et bonne journée,<br>L'équipe Tiro
    </p>
    
  </div>
</div>
`

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { groupId, senderName }: EmailRequest = await req.json()

    console.log('Sending email notification for group:', groupId, 'from:', senderName)

    // Get all users in the message group except the sender
    const { data: groupMembers, error: groupError } = await supabase
      .from('message_groups')
      .select(`
        id_user,
        users:id_user (
          email,
          name,
          surname
        )
      `)
      .eq('id_group', groupId)

    if (groupError) {
      console.error('Error fetching group members:', groupError)
      throw groupError
    }

    if (!groupMembers || groupMembers.length === 0) {
      console.log('No group members found for group:', groupId)
      return new Response(JSON.stringify({ success: true, message: 'No members to notify' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Filter out members without email and the sender
    const recipientEmails = groupMembers
      .filter(member => member.users?.email && `${member.users.name} ${member.users.surname}`.trim() !== senderName)
      .map(member => member.users!.email)

    console.log('Sending notifications to:', recipientEmails)

    if (recipientEmails.length === 0) {
      console.log('No recipients to notify')
      return new Response(JSON.stringify({ success: true, message: 'No recipients to notify' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Send emails to all recipients
    const emailPromises = recipientEmails.map(email => 
      resend.emails.send({
        from: 'Tiro <noreply@resend.dev>',
        to: [email],
        subject: `Nouveau message de ${senderName} - Tiro`,
        html: generateMessageNotificationHTML(senderName),
      })
    )

    const results = await Promise.allSettled(emailPromises)
    
    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length

    console.log(`Email notifications sent: ${successful} successful, ${failed} failed`)

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to send email to ${recipientEmails[index]}:`, result.reason)
      }
    })

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successful,
      failed: failed,
      total: recipientEmails.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error: any) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Failed to send email notifications',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

Deno.serve(handler)