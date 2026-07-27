const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const Parser = require('rss-parser');
const cron = require('node-cron');
const { Resend } = require('resend');
const { marked } = require('marked');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Agent tools
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const parser = new Parser();
const resend = new Resend(process.env.RESEND_API_KEY);

let isSubscribed = true;

// Helper: Converts Raw Markdown into a TLDR-style HTML Layout
function renderWorldClassEmailHTML(markdownContent) {
    const htmlBody = marked.parse(markdownContent);
    const formattedDate = new Date().toLocaleDateString('en-KE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tech Briefing</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f5f7; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1e293b; -webkit-font-smoothing:antialiased;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f7; padding: 40px 10px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <!-- TLDR / Tech-Style Top Header -->
                        <tr>
                            <td style="padding: 28px 32px 20px 32px; background-color: #0f172a; text-align: left;">
                                <table width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td>
                                            <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#38bdf8; background:rgba(56, 189, 248, 0.12); padding:4px 10px; border-radius:4px; border:1px solid rgba(56, 189, 248, 0.25);">DAILY BRIEFING</span>
                                            <h1 style="margin:12px 0 4px 0; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">Tech Briefing Agent</h1>
                                            <p style="margin:0; font-size:13px; color:#94a3b8;">${formattedDate} &bull; 3 Min Read</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Main Content Body -->
                        <tr>
                            <td style="padding: 28px 32px; font-size: 15px; line-height: 1.65; color: #334155;">
                                <style>
                                    h2 { font-size: 16px !important; text-transform: uppercase !important; letter-spacing: 0.8px !important; color: #0f172a !important; margin-top: 24px !important; margin-bottom: 12px !important; border-bottom: 2px solid #f1f5f9 !important; padding-bottom: 6px !important; font-weight: 700 !important; }
                                    h3 { font-size: 15px !important; color: #2563eb !important; margin-top: 18px !important; margin-bottom: 6px !important; font-weight: 600 !important; }
                                    p { margin-bottom: 14px !important; color: #475569 !important; }
                                    ul { padding-left: 18px !important; margin-bottom: 20px !important; margin-top: 0 !important; }
                                    li { margin-bottom: 10px !important; color: #334155 !important; }
                                    strong { color: #0f172a !important; font-weight: 600 !important; }
                                    blockquote { border-left: 3px solid #2563eb; margin: 16px 0; padding: 8px 14px; background-color: #f8fafc; color: #475569; font-style: italic; }
                                    a { color: #2563eb; text-decoration: none; font-weight: 500; }
                                </style>
                                ${htmlBody}
                            </td>
                        </tr>

                        <!-- Minimal Footer -->
                        <tr>
                            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 500; color: #64748b;">Tech Briefing AI &bull; Autonomous Newsletter</p>
                                <p style="margin: 0; font-size: 11px; color: #94a3b8;">Nairobi, Kenya &bull; Scheduled Daily at 9:00 AM EAT</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

// Core AI Briefing Generator
async function generateNewsletterContent() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("Missing valid Groq API Key.");
    }

    const feed = await parser.parseURL('https://techcrunch.com/feed/');
    const topArticles = feed.items.slice(0, 5).map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.contentSnippet || "No summary available."
    }));

    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are an elite Tech Briefing AI Agent modeled after TLDR Tech and The Pragmatic Engineer. Process raw RSS JSON and output Markdown content. Rules:\n1. Use section headers: '## Top Headlines' and '## Editorial Analysis'\n2. For each article bullet, format like: * **[Article Title](link)**: Concise summary highlighting key technical insights and impact.\n3. Do NOT output H1 titles, greeting text, or conversational intro/outro."
            },
            {
                role: "user",
                content: `Real-time articles:\n${JSON.stringify(topArticles, null, 2)}`
            }
        ],
        model: "llama-3.3-70b-versatile"
    });

    return chatCompletion.choices[0]?.message?.content || "Failed to generate briefing.";
}

// Ping Route
app.get('/ping', (req, res) => res.status(200).send("OK"));

// Read Route for React UI
app.get('/api/newsletter', async (req, res) => {
    try {
        const rawMarkdown = await generateNewsletterContent();
        res.json({ newsletter: rawMarkdown });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Immediate Test Email Route
app.get('/api/test-email', async (req, res) => {
    res.json({ message: "⚙️ Dispatching world-class email... check your inbox in 10-15s." });

    try {
        const markdown = await generateNewsletterContent();
        const html = renderWorldClassEmailHTML(markdown);

        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: process.env.EMAIL_TO,
            subject: `⚡ Tech Briefing - ${new Date().toLocaleDateString('en-KE')}`,
            html: html
        });
        console.log("🚀 Test email sent with TLDR layout!");
    } catch (err) {
        console.error("❌ Email failed:", err.message);
    }
});

// Scheduled Node Cron Job (9:00 AM EAT, Mon-Fri)
cron.schedule('0 9 * * 1-5', async () => {
    if (!isSubscribed) return;

    try {
        const markdown = await generateNewsletterContent();
        const html = renderWorldClassEmailHTML(markdown);

        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: process.env.EMAIL_TO,
            subject: `☀️ Morning Tech Briefing - ${new Date().toLocaleDateString('en-KE')}`,
            html: html
        });
        console.log("🚀 Cron newsletter delivered successfully!");
    } catch (err) {
        console.error("❌ Cron failed:", err.message);
    }
}, {
    scheduled: true,
    timezone: "Africa/Nairobi"
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 AI Agent running on port ${PORT}`));