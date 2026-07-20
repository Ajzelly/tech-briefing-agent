import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function NewsletterView() {
    const [newsletter, setNewsletter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Check if today is Saturday (6) or Sunday (0)
    const currentDay = new Date().getDay();
    const isWeekend = currentDay === 0 || currentDay === 6;

    const fetchBriefing = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:5000/api/newsletter');
            if (!response.ok) {
                throw new Error('AI Agent is unreachable. Please verify your backend terminal is running node index.js.');
            }
            const data = await response.json();
            setNewsletter(data.newsletter);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBriefing();
    }, []);

    return (
        <div style={{ backgroundColor: '#f4f4f7', minHeight: '100vh', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1a1a1a' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#ffffff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb' }}>
                
                {/* Editorial Header */}
                <header style={{ borderBottom: '2px solid #111', paddingBottom: '24px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#0070f3', backgroundColor: '#e6f0ff', padding: '6px 12px', borderRadius: '20px' }}>
                            🤖 AI & Tech Executive Digest
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                    
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px', lineHeight: '1.2' }}>
                        The Silicon Briefing
                    </h1>
                    <p style={{ margin: '0 0 20px 0', color: '#4b5563', fontSize: '1.1rem', lineHeight: '1.5' }}>
                        Synthesizing global tech developments, frontier AI infrastructure, and the macro business of automation.
                    </p>

                    {/* Schedule Indicator Bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', backgroundColor: '#f9fafb', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>
                            📅 Cadence: <span style={{ color: '#10b981' }}>Mon — Fri (Skipping Weekends)</span>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                            <button 
                                onClick={fetchBriefing} 
                                disabled={loading}
                                style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '6px' }}
                            >
                                {loading ? '🤖 Compiling...' : '🔄 Run Live Agent'}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Dynamic Weekend Notice */}
                {isWeekend && !loading && (
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        <strong>⏸️ Weekend Pause Protocol:</strong> Technical markets and primary corporate research pipelines are closed today. Clicking "Run Live Agent" will pull the final closing summary from Friday's active market streams.
                    </div>
                )}

                {/* Error Box */}
                {error && (
                    <div style={{ color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.95rem' }}>
                        <strong>System Interruption:</strong> {error}
                    </div>
                )}

                {/* Content Render Window */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ margin: '0 auto 20px auto', width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #0070f3', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <p style={{ fontStyle: 'italic', color: '#4b5563', fontSize: '0.95rem' }}>Scraping global tech indexes and prompting Groq Llama-3.3-70b...</p>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <main style={{ minHeight: '300px' }}>
                        <article style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#1f2937' }}>
                            <ReactMarkdown>{newsletter || "Briefing standby. Click 'Run Live Agent' to prompt your core engine."}</ReactMarkdown>
                        </article>
                    </main>
                )}
            </div>
        </div>
    );
}