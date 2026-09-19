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
      detailedSections = null,
      sections = {},
      additionalNotes = ''
    } = payload || {};

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY environment variable is not configured in Vercel settings.' });
    }

    const RECIPIENT_EMAIL = process.env.DEVELOPER_EMAIL || 'dan17buck@gmail.com';

    // Count answers for summary
    let totalQuestions = 0;
    let answeredQuestions = 0;

    let sectionsHtml = '';
    let markdownDoc = `# KRABIT — Product & Business Requirements Specification\n\n`;
    markdownDoc += `**Client Legal Name:** ${clientName}\n`;
    markdownDoc += `**Company / Entity:** ${company}\n`;
    markdownDoc += `**Digital Signature:** ${signature || clientName}\n`;
    markdownDoc += `**Submission Date:** ${submissionDate}\n`;
    markdownDoc += `**Lead Developer:** Erioluwa Daniel\n`;
    markdownDoc += `**Data Storage Retention:** Zero-Retention (Dispatched strictly in transient RAM)\n\n`;
    markdownDoc += `---\n\n`;

    // Process detailedSections (includes question title, full question description/prompt, and answer)
    if (Array.isArray(detailedSections) && detailedSections.length > 0) {
      for (const sec of detailedSections) {
        if (!sec.items || sec.items.length === 0) continue;

        markdownDoc += `## ${sec.title}\n\n`;
        if (sec.note) {
          markdownDoc += `> **Directives:**\n> ${sec.note.replace(/\n/g, '\n> ')}\n\n`;
        }

        let questionsHtml = '';
        for (const item of sec.items) {
          totalQuestions++;
          const isAnswered = item.answer && item.answer !== '—' && item.answer !== 'Not specified';
          if (isAnswered) answeredQuestions++;

          const formattedAns = Array.isArray(item.answer) 
            ? (item.answer.length > 0 ? item.answer.join(', ') : '<em>None selected</em>')
            : (item.answer && item.answer !== '—' ? String(item.answer).replace(/\n/g, '<br/>') : '<em style="color:#94a3b8;">Not specified / Skipped</em>');

          const mdAns = Array.isArray(item.answer) ? item.answer.join(', ') : (item.answer || '—');
          markdownDoc += `### ${item.title}\n\n${item.desc || ''}\n\n**Answer:** ${mdAns}\n\n`;

          questionsHtml += `
            <div style="margin-bottom: 16px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; border-left: 4px solid ${isAnswered ? '#10b981' : '#cbd5e1'};">
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">
                ${item.title}
              </div>
              ${item.desc ? `<div style="font-size: 12.5px; color: #475569; margin-bottom: 8px; line-height: 1.4;">${item.desc}</div>` : ''}
              <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                Client Answer:
              </div>
              <div style="font-size: 13.5px; color: #0f172a; font-weight: 600; line-height: 1.5; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                ${formattedAns}
              </div>
            </div>
          `;
        }

        sectionsHtml += `
          <div style="margin-bottom: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="background: #0f172a; color: #ffffff; padding: 14px 20px; font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">
              ${sec.title}
            </div>
            ${sec.note ? `<div style="background: #f1f5f9; padding: 10px 20px; font-size: 12px; color: #334155; border-bottom: 1px solid #e2e8f0; line-height: 1.4;"><strong>Section Directives:</strong><br/>${sec.note.replace(/\n/g, '<br/>')}</div>` : ''}
            <div style="padding: 18px 20px 6px;">
              ${questionsHtml}
            </div>
          </div>
        `;
      }
    } else {
      // Fallback if detailedSections was not passed
      for (const [secTitle, questions] of Object.entries(sections)) {
        if (!questions || Object.keys(questions).length === 0) continue;

        markdownDoc += `## ${secTitle}\n\n`;

        let questionsHtml = '';
        for (const [qText, qAns] of Object.entries(questions)) {
          totalQuestions++;
          const isAnswered = qAns && qAns !== '—' && qAns !== 'Not specified';
          if (isAnswered) answeredQuestions++;

          const formattedAns = Array.isArray(qAns) 
            ? (qAns.length > 0 ? qAns.join(', ') : '<em>None selected</em>')
            : (qAns && qAns !== '—' ? String(qAns).replace(/\n/g, '<br/>') : '<em style="color:#94a3b8;">Not specified / Skipped</em>');

          const mdAns = Array.isArray(qAns) ? qAns.join(', ') : (qAns || '—');
          markdownDoc += `### ${qText}\n\n**Answer:** ${mdAns}\n\n`;

          questionsHtml += `
            <div style="margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
                ${qText}
              </div>
              <div style="font-size: 14px; color: #0f172a; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid ${isAnswered ? '#10b981' : '#cbd5e1'}; line-height: 1.5;">
                <strong>Answer:</strong> ${formattedAns}
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
    }

    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>KRABIT Specification Document</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #334155;">
        <div style="max-width: 860px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background: #0b0f19; padding: 32px 28px; border-bottom: 3px solid #10b981;">
            <span style="font-size: 11px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 1.5px;">Official Requirements Specification</span>
            <h1 style="color: #ffffff; font-size: 24px; margin: 8px 0 6px; font-weight: 800; letter-spacing: -0.5px;">
              KRABIT — Product & Business Requirements
            </h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
              Formal client questionnaire intake document with full questions, descriptions, and client answers.
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
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Completed Questions:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${answeredQuestions} / ${totalQuestions} answered</td>
                <td style="padding: 6px 0; color: #64748b;">Attachments:</td>
                <td style="padding: 6px 0; color: #0284c7; font-weight: 600;">HTML & Markdown Included</td>
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
              Delivered to <strong>${RECIPIENT_EMAIL}</strong> via automated specification dispatch.
            </p>
            <p style="margin: 0; color: #94a3b8; font-size: 11px;">
              Privacy Guarantee: This document was processed strictly in transient server memory and was never written to any database disk.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Prepare attachments: both an offline-viewable standalone HTML report and a Markdown document
    const sanitizedClient = (clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
    const attachments = [
      {
        filename: `KRABIT_Requirements_Specification_${sanitizedClient}.html`,
        content: Buffer.from(htmlEmail).toString('base64')
      },
      {
        filename: `KRABIT_Requirements_Specification_${sanitizedClient}.md`,
        content: Buffer.from(markdownDoc).toString('base64')
      }
    ];

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
        html: htmlEmail,
        attachments: attachments
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return res.status(500).json({
        error: 'Failed to deliver automated email document.',
        details: resendData.message || JSON.stringify(resendData)
      });
    }

    // Return success without storing anything in database
    return res.status(200).json({
      success: true,
      message: 'Questionnaire processed and delivered directly to Erioluwa Daniel with zero database retention.',
      deliveryId: resendData.id,
      answeredCount: answeredQuestions,
      totalCount: totalQuestions
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error processing questionnaire', details: err.message });
  }
}
