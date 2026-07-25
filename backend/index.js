const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const Parser = require('rss-parser');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 5000;

// Allow your React application to talk to this backend safely
app.use(cors());
app.use(express.json());

// Initialize your Agent tools
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const parser = new Parser();

// Global Subscription State (Saves your preference)
let isSubscribed = true;

// 📧 Configure Email Transporter explicitly for Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Helper function that contains your exact Core Agent logic
async function generateNewsletterContent() {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('your_actual')) {
        throw new Error("Missing valid Groq API Key.");
    }

    // 1. Tool Execution: Fetch live trending tech news headlines
    const feed = await parser.parseURL('https://techcrunch.com/feed/');
    const topArticles = feed.items.slice(0, 5).map(item => ({
        title: item.title,
        snippet: item.contentSnippet || "No summary snippet available."
    }));

    const realTimeContext = JSON.stringify(topArticles, null, 2);

    // 2. LLM Synthesis
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

// 🌐 EXISTING ROUTE: For checking manually on your phone/laptop UI
app.get('/api/newsletter', async (req, res) => {
    try {
        const compiledNewsletter = await generateNewsletterContent();
        res.json({ newsletter: compiledNewsletter });
    } catch (error) {
        console.error("AI Agent Error Log:", error);
        res.status(500).json({ error: error.message || "The AI briefing agent failed to compile today's news." });
    }
});

// 🧪 TEMPORARY TEST ROUTE: Trigger an email immediately by visiting this link
app.get('/api/test-email', async (req, res) => {
    try {
        console.log("🧪 Triggering instant test email...");
        const briefingText = await generateNewsletterContent();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_TO,
            subject: `🧪 Test Tech Briefing - ${new Date().toLocaleDateString('en-KE')}`,
            text: briefingText,
            html: `<div style="font-family: sans-serif; padding: 20px;"><div style="white-space: pre-wrap;">${briefingText}</div></div>`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: "🚀 Test email sent successfully! Check your Strathmore inbox." });
    } catch (error) {
        console.error("❌ Test email failed:", error);
        res.status(500).json({ error: "Failed to send test email.", details: error.message });
    }
});

// 🛑 CANCEL ROUTE: Allows you to unsubscribe instantly
app.post('/api/unsubscribe', (req, res) => {
    isSubscribed = false;
    console.log("❌ You have successfully unsubscribed from the daily newsletter.");
    res.json({ message: "Subscription cancelled successfully. You will no longer receive morning emails." });
});

// 🔄 RE-SUBSCRIBE ROUTE (Optional convenience)
app.post('/api/subscribe', (req, res) => {
    isSubscribed = true;
    console.log("✅ Subscription re-activated!");
    res.json({ message: "Subscription active! See you at 9:00 AM EAT." });
});

// ⏰ AUTOMATED CRON JOB: Runs at 9:00 AM, Monday through Friday, in Kenya Time (EAT)
// ⏰ TEMPORARY TEST CRON: Runs at 13:15 (1:15 PM) on Saturdays (6)
cron.schedule('15 13 * * 6', async () => {
    console.log("⏰ Clock struck 1:15 PM EAT on Saturday...");
    
    if (!isSubscribed) {
        console.log("⏭️ Email skipped: User is currently unsubscribed.");
        return;
    }
// ... rest of your email logic stays the same
    try {
        const briefingText = await generateNewsletterContent();
        const unsubscribeLink = `http://localhost:${PORT}/api/unsubscribe`; 

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_TO,
            subject: `☀️ Morning Tech Briefing - ${new Date().toLocaleDateString('en-KE')}`,
            text: `${briefingText}\n\nTo unsubscribe, please send a POST request to${unsubscribeLink}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
                    <div style="white-space: pre-wrap;">${briefingText}</div>
                    <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;"/>
                    <p style="font-size: 12px; color: #888; text-align: center;">
                        Sent automatically to your inbox. Want out? 
                        <form action="${unsubscribeLink}" method="POST" style="display:inline;">
                            <button type="submit" style="background:none; border:none; color:#0066cc; text-decoration:underline; cursor:pointer; padding:0;">Unsubscribe here</button>
                        </form>
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("🚀 Daily newsletter successfully emailed to your inbox!");
    } catch (error) {
        console.error("❌ Failed to process scheduled morning email:", error);
    }
}, {
    scheduled: true,
    timezone: "Africa/Nairobi" // 🇰🇪 Locks execution tightly to East Africa Time
});

// 🏓 PING ROUTE: Keeps the Render server awake without returning massive HTML
app.get('/ping', (req, res) => {
    console.log("🏓 Server pinged by cron-job.org to stay awake!");
    res.send("Agent is awake.");
});

app.listen(PORT, () => console.log(`🚀 AI Agent Backend running smoothly on http://localhost:${PORT}`));

