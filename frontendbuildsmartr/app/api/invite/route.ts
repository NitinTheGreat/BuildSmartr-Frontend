import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { email, userName } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const inviterName = userName || 'Someone'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://iivy.ai'

    const { data, error } = await resend.emails.send({
      from: 'IIVY <noreply@iivy.ai>', // Update this to your verified domain
      to: email,
      subject: `${inviterName} invited you to try IIVY`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #1f2121; border-radius: 12px; border: 1px solid #2a2a2a;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h1 style="margin: 0; font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #10b981, #059669); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        IIVY
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 20px 40px 30px 40px;">
                      <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #ffffff; text-align: center;">
                        You're Invited! 🎉
                      </h2>
                      <p style="margin: 0 0 24px 0; font-size: 16px; color: #a1a1aa; line-height: 1.6; text-align: center;">
                        <strong style="color: #10b981;">${inviterName}</strong> thinks you'd love IIVY — an AI-powered research assistant for smarter building decisions.
                      </p>
                      <p style="margin: 0 0 32px 0; font-size: 14px; color: #71717a; line-height: 1.6; text-align: center;">
                        Join thousands of construction professionals who are making better decisions with AI-powered insights.
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${appUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                              Get Started for Free
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #2a2a2a;">
                      <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center; line-height: 1.6;">
                        This invite was sent by ${inviterName} via IIVY.<br>
                        If you didn't expect this email, you can safely ignore it.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('[invite] Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[invite] Email sent successfully:', data)
    return NextResponse.json({ success: true, messageId: data?.id })

  } catch (error) {
    console.error('[invite] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send invite' },
      { status: 500 }
    )
  }
}
