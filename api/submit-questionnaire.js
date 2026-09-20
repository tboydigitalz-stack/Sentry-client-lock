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

    let totalQuestions = 0;
    let answeredQuestions = 0;

    let sectionsHtml = '';
    let markdownDoc = `# KRABIT — Product & Business Requirements Specification\n\n`;
    markdownDoc += `**Client Legal Name:** ${clientName}\n`;
    markdownDoc += `**Company / Entity:** ${company}\n`;
    markdownDoc += `**Digital Signature:** ${signature || clientName}\n`;
    markdownDoc += `**Submission Date:** ${submissionDate}\n`;
    markdownDoc += `**Lead Developer:** Erioluwa Daniel\n`;
    markdownDoc += `**Data Storage Retention:** Zero-Retention (Transient RAM Dispatched)\n\n`;
    markdownDoc += `---\n\n`;

    // Process all 24 sections with full question title, prompt, and answer
    // Optimized for size (<70 KB) to prevent Gmail email clipping
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
            ? (item.answer.length > 0 ? item.answer.join(', ') : 'None selected')
            : (item.answer && item.answer !== '—' ? String(item.answer).replace(/\n/g, '<br/>') : 'Not specified / Skipped');

          const mdAns = Array.isArray(item.answer) ? item.answer.join(', ') : (item.answer || '—');
          markdownDoc += `### ${item.title}\n\n${item.desc || ''}\n\n**Answer:** ${mdAns}\n\n`;

          questionsHtml += `<div style="margin-bottom:10px;padding:10px 12px;border:1px solid #27272a;border-radius:4px;background:#09090b;"><div style="font-size:12.5px;font-weight:700;color:#ffffff;margin-bottom:2px;">${item.title}</div>${item.desc ? `<div style="font-size:11px;color:#a1a1aa;margin-bottom:6px;line-height:1.35;">${item.desc}</div>` : ''}<div style="font-size:10px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Client Answer:</div><div style="font-size:12.5px;color:#ffffff;background:#141417;padding:6px 10px;border-left:3px solid #ffffff;border-radius:2px;line-height:1.45;">${formattedAns}</div></div>`;
        }

        sectionsHtml += `<div style="margin-bottom:20px;border:1px solid #27272a;border-radius:6px;overflow:hidden;background:#050505;"><div style="background:#141417;color:#ffffff;padding:10px 14px;font-size:12.5px;font-weight:800;letter-spacing:0.5px;border-bottom:1px solid #27272a;">${sec.title}</div>${sec.note ? `<div style="background:#09090b;padding:8px 14px;font-size:11px;color:#a1a1aa;border-bottom:1px solid #27272a;line-height:1.35;"><strong>Directives:</strong><br/>${sec.note.replace(/\n/g, '<br/>')}</div>` : ''}<div style="padding:12px 12px 2px;">${questionsHtml}</div></div>`;
      }
    } else {
      // Fallback
      for (const [secTitle, questions] of Object.entries(sections)) {
        if (!questions || Object.keys(questions).length === 0) continue;

        markdownDoc += `## ${secTitle}\n\n`;

        let questionsHtml = '';
        for (const [qText, qAns] of Object.entries(questions)) {
          totalQuestions++;
          const isAnswered = qAns && qAns !== '—' && qAns !== 'Not specified';
          if (isAnswered) answeredQuestions++;

          const formattedAns = Array.isArray(qAns) 
            ? (qAns.length > 0 ? qAns.join(', ') : 'None selected')
            : (qAns && qAns !== '—' ? String(qAns).replace(/\n/g, '<br/>') : 'Not specified / Skipped');

          const mdAns = Array.isArray(qAns) ? qAns.join(', ') : (qAns || '—');
          markdownDoc += `### ${qText}\n\n**Answer:** ${mdAns}\n\n`;

          questionsHtml += `<div style="margin-bottom:10px;padding:10px 12px;border:1px solid #27272a;border-radius:4px;background:#09090b;"><div style="font-size:12.5px;font-weight:700;color:#ffffff;margin-bottom:2px;">${qText}</div><div style="font-size:10px;font-weight:700;color:#71717a;text-transform:uppercase;margin-bottom:2px;">Client Answer:</div><div style="font-size:12.5px;color:#ffffff;background:#141417;padding:6px 10px;border-left:3px solid #ffffff;border-radius:2px;">${formattedAns}</div></div>`;
        }

        sectionsHtml += `<div style="margin-bottom:20px;border:1px solid #27272a;border-radius:6px;overflow:hidden;background:#050505;"><div style="background:#141417;color:#ffffff;padding:10px 14px;font-size:12.5px;font-weight:800;border-bottom:1px solid #27272a;">${secTitle}</div><div style="padding:12px 12px 2px;">${questionsHtml}</div></div>`;
      }
    }

    const htmlEmail = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>KRABIT Specification</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#000000;margin:0;padding:16px;color:#ffffff;"><div style="max-width:800px;margin:0 auto;background:#050505;border-radius:8px;border:1px solid #27272a;overflow:hidden;"><div style="background:#000000;padding:24px 20px;border-bottom:1px solid #27272a;"><span style="font-size:10px;font-weight:800;color:#a1a1aa;text-transform:uppercase;letter-spacing:1.5px;">Official Requirements Specification</span><h1 style="color:#ffffff;font-size:20px;margin:6px 0 4px;font-weight:800;letter-spacing:-0.5px;">KRABIT — Product & Business Requirements</h1><p style="color:#a1a1aa;font-size:12px;margin:0;">Formal client questionnaire intake document across all 24 sections.</p></div><div style="background:#09090b;padding:16px 20px;border-bottom:1px solid #27272a;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><tr><td style="padding:4px 0;color:#71717a;width:25%;">Client Legal Name:</td><td style="padding:4px 0;color:#ffffff;font-weight:700;">${clientName}</td><td style="padding:4px 0;color:#71717a;width:25%;">Company / Entity:</td><td style="padding:4px 0;color:#ffffff;font-weight:700;">${company}</td></tr><tr><td style="padding:4px 0;color:#71717a;">Digital Signature:</td><td style="padding:4px 0;color:#ffffff;font-family:monospace;">${signature || clientName}</td><td style="padding:4px 0;color:#71717a;">Submission Date:</td><td style="padding:4px 0;color:#ffffff;">${submissionDate}</td></tr><tr><td style="padding:4px 0;color:#71717a;">Lead Developer:</td><td style="padding:4px 0;color:#ffffff;font-weight:700;">Erioluwa Daniel</td><td style="padding:4px 0;color:#71717a;">Data Storage:</td><td style="padding:4px 0;color:#ffffff;font-weight:700;">Zero-Database (Ephemeral)</td></tr><tr><td style="padding:4px 0;color:#71717a;">Questions Completed:</td><td style="padding:4px 0;color:#ffffff;font-weight:600;">${answeredQuestions} / ${totalQuestions} answered</td><td style="padding:4px 0;color:#71717a;">Attachments:</td><td style="padding:4px 0;color:#a1a1aa;font-weight:600;">HTML & Markdown Attached</td></tr></table></div><div style="padding:20px;">${sectionsHtml}${additionalNotes ? `<div style="margin-top:20px;padding:14px;background:#09090b;border:1px solid #27272a;border-radius:6px;"><strong style="color:#ffffff;font-size:12.5px;display:block;margin-bottom:4px;">Additional Client Notes:</strong><div style="font-size:12px;color:#a1a1aa;white-space:pre-wrap;">${additionalNotes}</div></div>` : ''}</div><div style="background:#09090b;padding:16px 20px;text-align:center;border-top:1px solid #27272a;font-size:11px;color:#71717a;"><p style="margin:0 0 4px;">Delivered to <strong>${RECIPIENT_EMAIL}</strong> via automated specification dispatch.</p><p style="margin:0;color:#52525b;font-size:10px;">Zero-Database Protocol: Processed strictly in transient RAM and wiped immediately upon dispatch.</p></div></div></body></html>`;

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
