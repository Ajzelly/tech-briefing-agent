const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const Parser = require('rss-parser');
const cron = require('node-cron');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Agent tools
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const parser = new Parser();
const resend = new Resend(process.env.RESEND_API_KEY);

// Global Subscription State
let isSubscribed = true;

// Core AI Briefing Generator Function
async function generateNewsletterContent() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("Missing valid Groq API Key.");
    }

    // 1. Fetch live RSS news context from TechCrunch
    const feed = await parser.parseURL('https://techcrunch.com/feed/');
    const topArticles = feed.items.slice(0, 5).map(item => ({
        title: item.title,
        snippet: item.contentSnippet || "No summary snippet available."
    }));

    const realTimeContext = JSON.stringify(topArticles, null, 2);

    // 2. Synthesize using Groq Llama 3
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are an elite Tech Briefing AI Agent. Your task is to process a raw JSON list of real-time tech articles and synthesize them into a highly professional, engaging daily newsletter. Use beautiful Markdown styling, concise bullet points, bold key technical words, and add a brief editorial analysis section at the end."
            },
            {
                role: "user",
                content: `Here is the real-time tech context for today's briefing:\n${realTimeContext}`
            }
        ],
        model: "llama-3.3-70b-versatile"
    });

    return chatCompletion.choices[0]?.message?.content || "The agent failed to parse the text layout.";
}

// 🏓 LIGHTWEIGHT PING ROUTE: Keeps Render awake without overloading cron-job.org logs
app.get('/ping', (req, res) => {
    res.status(200).send("OK");
});

// 🌐 READ ROUTE: Get compiled newsletter as JSON (for Frontend/UI)
app.get('/api/newsletter', async (req, res) => {
    try {
        const compiledNewsletter = await generateNewsletterContent();
        res.json({ newsletter: compiledNewsletter });
    } catch (error) {
        console.error("AI Agent Error Log:", error);
        res.status(500).json({ error: error.message || "Failed to compile newsletter." });
    }
});

// 🧪 ASYNCHRONOUS TEST ROUTE: Prevents Render Gateway Timeout Error
app.get('/api/test-email', async (req, res) => {
    res.json({ 
        message: "⚙️ Email process started in the background! Please check your inbox in ~10-20 seconds." 
    });

    try {
        console.log("🧪 Fetching RSS feeds and running Groq AI synthesis...");
        const briefingText = await generateNewsletterContent();

        console.log("📨 Sending test email via Resend API...");
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: process.env.EMAIL_TO,
            subject: `🧪 Test Tech Briefing - ${new Date().toLocaleDateString('en-KE')}`,
            html: `<div style="font-family: sans-serif; padding: 20px;"><div style="white-space: pre-wrap;">${briefingText}</div></div>`
        });

        if (error) {
            console.error("❌ Resend API Error:", error.message);
        } else {
            console.log("🚀 Test email sent successfully! Email ID:", data.id);
        }
    } catch (error) {
        console.error("❌ Background email task failed:", error.message);
    }
});

// ⏰ EXTERNAL CRON TRIGGER ROUTE (Can be hit directly by cron-job.org at 9:00 AM)
app.get('/api/send-daily-briefing', async (req, res) => {
    res.json({ message: "⚙️ Daily briefing triggered successfully!" });

    if (!isSubscribed) {
        console.log("⏭️ Email skipped: User is currently unsubscribed.");
        return;
    }

    try {
        console.log("⏰ Daily briefing triggered: Synthesizing tech news...");
        const briefingText = await generateNewsletterContent();

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: process.env.EMAIL_TO,
            subject: `☀️ Morning Tech Briefing - ${new Date().toLocaleDateString('en-KE')}`,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;"><div style="white-space: pre-wrap;">${briefingText}</div></div>`
        });

        if (error) {
            console.error("❌ Resend API Error:", error.message);
        } else {
            console.log("🚀 Daily newsletter successfully emailed via Resend! ID:", data.id);
        }
    } catch (error) {
        console.error("❌ Daily briefing failed:", error.message);
    }
});

// 🛑 UNSUBSCRIBE ROUTE
app.post('/api/unsubscribe', (req, res) => {
    isSubscribed = false;
    console.log("❌ User unsubscribed from daily emails.");
    res.json({ message: "Subscription cancelled successfully." });
});

// 🔄 RE-SUBSCRIBE ROUTE
app.post('/api/subscribe', (req, res) => {
    isSubscribed = true;
    console.log("✅ Subscription re-activated!");
    res.json({ message: "Subscription active!" });
});

// ⏰ INTERNAL NODE CRON JOB: Runs at 9:00 AM, Monday through Friday, East Africa Time (EAT)
cron.schedule('0 9 * * 1-5', async () => {
    console.log("⏰ Internal clock struck 9:00 AM EAT...");

    if (!isSubscribed) {
        console.log("⏭️ Email skipped: User is currently unsubscribed.");
        return;
    }

    try {
        const briefingText = await generateNewsletterContent();

        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: process.env.EMAIL_TO,
            subject: `☀️ Morning Tech Briefing - ${new Date().toLocaleDateString('en-KE')}`,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;"><div style="white-space: pre-wrap;">${briefingText}</div></div>`
        });

        console.log("🚀 Scheduled daily newsletter successfully emailed via Resend!");
    } catch (error) {
        console.error("❌ Scheduled email failed:", error.message);
    }
}, {
    scheduled: true,
    timezone: "Africa/Nairobi"
});

app.listen(PORT, () => console.log(`🚀 AI Agent running on http://localhost:${PORT}`));