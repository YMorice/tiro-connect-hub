import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PasswordResetEmail } from './_templates/password-reset.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const {
      user,
      email_data: { token, email_action_type },
    } = body

    // Only handle password recovery emails
    if (email_action_type !== 'recovery') {
      return new Response('Not a recovery email', { status: 400 })
    }

    const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('//', '//').replace('supabase.co', 'supabase.co')}/update-password`

    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        token,
        redirect_to: redirectUrl,
      })
    )

    const { error } = await resend.emails.send({
      from: 'Tiro <noreply@resend.dev>',
      to: [user.email],
      subject: 'Réinitialisation de votre mot de passe - Tiro',
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Password reset email sent successfully to:', user.email)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-password-reset function:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Failed to send email',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})