// api/submit-questionnaire.js
// Runs on Vercel Serverless Functions with Node.js 18+ (uses native global fetch)

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const {
      clientName = 'Unspecified Client',
      company = 'Unspecified Company',
      signature = '',
      submissionDate = new Date().toUTCString(),
      sections = {},
      additionalNotes = ''
    } = payload || {};

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY environment variable is not configured in Vercel settings.' });
    }

    // Build structured executive HTML email
    let sectionsHtml = '';
    for (const [secTitle, questions] of Object.entries(sections)) {
      if (!questions || Object.keys(questions).length === 0) continue;

      let questionsHtml = '';
      for (const [qText, qAns] of Object.entries(questions)) {
        const formattedAns = Array.isArray(qAns) 
          ? (qAns.length > 0 ? qAns.join(', ') : '<em>None selected</em>')
          : (qAns ? String(qAns).replace(/\n/g, '<br/>') : '<em>Not specified</em>');

        questionsHtml += `
          <div style="margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">
              ${qText}
            </div>
            <div style="font-size: 14px; color: #0f172a; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #0284c7; line-height: 1.5;">
              ${formattedAns}
            </div>
          </div>
        `;
      }

      sectionsHtml += `
        <div style="margin-bottom: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #0f172a; color: #ffffff; padding: 12px 18px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
            ${secTitle}
          </div>
          <div style="padding: 16px 18px;">
            ${questionsHtml}
          </div>
        </div>
      `;
    }

    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>KRABIT Specification Document</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #334155;">
        <div style="max-width: 820px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background: #0b0f19; padding: 32px 28px; border-bottom: 3px solid #10b981;">
            <span style="font-size: 11px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 1.5px;">Official Requirements Specification</span>
            <h1 style="color: #ffffff; font-size: 24px; margin: 8px 0 6px; font-weight: 800; letter-spacing: -0.5px;">
              KRABIT — Product & Business Requirements
            </h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
              Submitted by client for technical architecture, product specifications, and development execution.
            </p>
          </div>

          <!-- Metadata Grid -->
          <div style="background: #f8fafc; padding: 20px 28px; border-bottom: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 25%;">Client Legal Name:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${clientName}</td>
                <td style="padding: 6px 0; color: #64748b; width: 25%;">Company / Entity:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${company}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Digital Signature:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${signature || clientName}</td>
                <td style="padding: 6px 0; color: #64748b;">Submission Timestamp:</td>
                <td style="padding: 6px 0; color: #0f172a;">${submissionDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Lead Developer:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">Erioluwa Daniel</td>
                <td style="padding: 6px 0; color: #64748b;">Storage Retention:</td>
                <td style="padding: 6px 0; color: #059669; font-weight: 700;">Zero-Database (Ephemeral)</td>
              </tr>
            </table>
          </div>

          <!-- Body Sections -->
          <div style="padding: 28px;">
            ${sectionsHtml}

            ${additionalNotes ? `
              <div style="margin-top: 24px; padding: 18px; background: #fefce8; border: 1px solid #fef08a; border-radius: 8px;">
                <strong style="color: #854d0e; font-size: 14px; display: block; margin-bottom: 6px;">Additional Client Notes:</strong>
                <div style="font-size: 14px; color: #713f12; white-space: pre-wrap;">${additionalNotes}</div>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 6px;">
              Sent to <strong>${RECIPIENT_EMAIL}</strong> via Resend automated document delivery.
            </p>
            <p style="margin: 0; color: #94a3b8; font-size: 11px;">
              Privacy Guarantee: This document was processed strictly in transient server memory and was never written to any database disk.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Primary recipient matches the verified Resend account email for the default onboarding@resend.dev domain
    const RECIPIENT_EMAIL = process.env.DEVELOPER_EMAIL || 'dan17buck@gmail.com';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'KRABIT Requirements <onboarding@resend.dev>',
        to: [RECIPIENT_EMAIL],
        subject: `[KRABIT SPECIFICATION] Submission Received: ${clientName} (${company})`,
        html: htmlEmail
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return res.status(500).json({
        error: 'Failed to deliver automated email document.',
        details: resendData
      });
    }

    // Return success without storing anything in database
    return res.status(200).json({
      success: true,
      message: 'Questionnaire processed and delivered directly to Erioluwa Daniel with zero database retention.',
      deliveryId: resendData.id
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error processing questionnaire', details: err.message });
  }
}
