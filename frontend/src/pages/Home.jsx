import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import BoxDetailModal from '../components/BoxDetailModal';
import CheckoutModal from '../components/CheckoutModal';
import MyOrdersList from '../components/MyOrdersList';

/* ─────────────────────────────────────────────
   Add to your global CSS / index.css:

   @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');

   @keyframes floatBlob {
     0%, 100% { transform: translateY(0px) scale(1); }
     50%       { transform: translateY(-18px) scale(1.04); }
   }
   @keyframes fadeSlideUp {
     from { opacity: 0; transform: translateY(40px); }
     to   { opacity: 1; transform: translateY(0); }
   }
───────────────────────────────────────────── */

const HOW_IT_WORKS = [
    {
        step: '01',
        title: 'Browse listings',
        desc: 'See surplus food from restaurants near you — updated daily before closing time.',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
        ),
    },
    {
        step: '02',
        title: 'Reserve & pay',
        desc: 'Lock in your rescue box with a single tap. Secure payment, instant confirmation.',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        step: '03',
        title: 'Pick up & enjoy',
        desc: "Head to the merchant, show your code, and collect your rescue. That's it.",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
        ),
    },
];

const TIERS = [
    { label: 'Listing access',           free: 'Delayed (after 7PM)', premium: 'Early access (from 5PM)' },
    { label: 'SMS alerts for new drops', free: false,                 premium: true },
    { label: 'Distance filtering',       free: true,                  premium: true },
    { label: 'Order history',            free: true,                  premium: true },
    { label: 'Priority support',         free: false,                 premium: true },
];

const FAQS = [
    {
        q: "What's inside a rescue box?",
        a: "Each box contains surplus food from the merchant — typically a mix of their day's unsold items. The exact contents vary but the value is always higher than what you pay.",
    },
    {
        q: "Can I choose what's in my box?",
        a: "Not exactly — part of the fun is the surprise! You'll know the merchant and the type of cuisine, but the specific items are determined by what's left at the end of the day.",
    },
    {
        q: "How does pickup work?",
        a: "After paying, you'll receive a unique code. Head to the merchant during their collection window and show the code to collect your box.",
    },
    {
        q: "What is Premium membership?",
        a: "Premium members get early access to listings before they're opened to free users — meaning more choice and less chance of missing out.",
    },
    {
        q: "What if I can't collect my order?",
        a: "Please try to collect on time as the food is prepared for you. If you can't make it, contact the merchant directly as a courtesy.",
    },
];

const HeroStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes floatBlob {
            0%, 100% { transform: translateY(0px) scale(1); }
            50%       { transform: translateY(-18px) scale(1.04); }
        }
        @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(40px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .ch * { box-sizing: border-box; }

        .ch-title {
            display: block;
            font-family: 'Playfair Display', serif;
            font-weight: 900;
            line-height: 0.88;
            letter-spacing: -4px;
            white-space: nowrap;
        }
        .ch-title-solid   { color: #1a1a1a; }
        .ch-title-orange  { color: #f97316; font-style: italic; }
        .ch-title-outline {
            -webkit-text-stroke: 2.5px #f97316;
            color: transparent;
        }

        .ch-blob {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            animation: floatBlob 7s ease-in-out infinite;
        }

        .ch-btn-primary {
            background: #f97316;
            color: #fff;
            border: none;
            padding: 15px 40px;
            font-family: 'DM Sans', sans-serif;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.22s;
            display: inline-block;
        }
        .ch-btn-primary:hover { background: #ea6c0a; transform: translateY(-2px); }

        .ch-btn-ghost {
            background: transparent;
            color: #1a1a1a;
            border: 1.5px solid #1a1a1a;
            padding: 14px 32px;
            font-family: 'DM Sans', sans-serif;
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.22s;
            display: inline-block;
        }
        .ch-btn-ghost:hover { border-color: #f97316; color: #f97316; transform: translateY(-2px); }

        .ch-section-label {
            font-family: 'DM Sans', sans-serif;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: #f97316;
            margin-bottom: 16px;
        }
        .ch-section-title {
            font-family: 'Playfair Display', serif;
            font-weight: 900;
            line-height: 1.0;
            letter-spacing: -2px;
            color: #1a1a1a;
            margin: 0 0 8px;
        }

        .ch-step {
            padding: 40px 36px;
            border-top: 1.5px solid #e5e5e5;
            position: relative;
            transition: border-color 0.3s;
            cursor: default;
            background: #fff;
        }
        .ch-step:hover { border-color: #f97316; }
        .ch-step-underline {
            position: absolute;
            bottom: 0; left: 0;
            width: 0; height: 2px;
            background: #f97316;
            transition: width 0.45s ease;
        }
        .ch-step:hover .ch-step-underline { width: 100%; }

        .ch-faq-item { border-bottom: 1px solid #f0f0f0; overflow: hidden; }
        .ch-faq-item:first-child { border-top: 1px solid #f0f0f0; }
        .ch-faq-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 22px 0;
            background: none;
            border: none;
            cursor: pointer;
            text-align: left;
            gap: 16px;
        }
        .ch-faq-q {
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            font-size: 17px;
            color: #1a1a1a;
        }
        .ch-faq-icon {
            flex-shrink: 0;
            width: 28px; height: 28px;
            border-radius: 50%;
            border: 1.5px solid #e5e5e5;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.25s;
            color: #888;
            font-size: 16px;
            line-height: 1;
        }
        .ch-faq-item:hover .ch-faq-icon { border-color: #f97316; color: #f97316; }
        .ch-faq-answer {
            font-family: 'DM Sans', sans-serif;
            font-size: 14px;
            font-weight: 300;
            color: #666;
            line-height: 1.85;
            padding-bottom: 22px;
            max-width: 680px;
        }

        .ch-mission {
            background: #fff;
            border-bottom: 1px solid #ececec;
            padding: 80px 72px;
        }
        .ch-mission-inner {
            max-width: 1100px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 180px 1fr 320px;
            gap: 48px;
            align-items: center;
        }
        .ch-mission-label {
            font-family: 'DM Sans', sans-serif;
            font-size: 9px;
            font-weight: 600;
            letter-spacing: 3.5px;
            text-transform: uppercase;
            color: #aaa;
            line-height: 1.6;
        }
        .ch-mission-headline {
            font-family: 'Playfair Display', serif;
            font-weight: 900;
            font-size: clamp(32px, 4vw, 52px);
            line-height: 1.05;
            letter-spacing: -1.5px;
            color: #1a1a1a;
        }
        .ch-mission-body {
            font-family: 'DM Sans', sans-serif;
            font-size: 14px;
            font-weight: 300;
            color: #888;
            line-height: 1.85;
            border-left: 2px solid #f97316;
            padding-left: 20px;
        }

        .fade-up-1 { animation: fadeSlideUp 0.9s ease 0.1s  both; }
        .fade-up-2 { animation: fadeSlideUp 0.9s ease 0.25s both; }
        .fade-up-3 { animation: fadeSlideUp 0.9s ease 0.4s  both; }
        .fade-up-4 { animation: fadeSlideUp 0.9s ease 0.55s both; }
        .fade-up-5 { animation: fadeSlideUp 0.9s ease 0.7s  both; }
    `}</style>
);

const Home = ({ currentView, user, onOpenLogin, onLogout, onGoHome, onViewOrderStatus, onGoProfile }) => {
    const [items, setItems]                       = useState([]);
    const [loading, setLoading]                   = useState(true);
    const [selectedBox, setSelectedBox]           = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen]     = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutType, setCheckoutType]         = useState('pickup');
    const [checkoutTotal, setCheckoutTotal]       = useState(0);
    const [checkoutQuantity, setCheckoutQuantity] = useState(1);
    const [activeTab, setActiveTab]               = useState('browse');
    const [maxDist, setMaxDist]                   = useState(null);
    const [searchQuery, setSearchQuery]           = useState('');
    const [openFaq, setOpenFaq]                   = useState(null);

    const getCategoryImage = (name) => {
        const displayName = name || '';
        const match = displayName.match(/^\[([A-Z]+)\]/);
        const category = match ? match[1].toLowerCase() : 'others';
        const validCategories = ['bakery', 'meals', 'drinks', 'desserts', 'healthy', 'proteins', 'others'];
        return validCategories.includes(category) ? `/category-${category}.png` : '/category-others.png';
    };

    const formatName = (name) => (name || '').replace(/^\[[A-Z]+\]\s*/, '');

    useEffect(() => {
        if (activeTab === 'browse') {
            const fetchItems = async () => {
                setLoading(true);
                try {
                    const query = `
                        query GetListings($lat: Float, $long: Float, $max_dist: Float, $tier: String) {
                            listings(lat: $lat, long: $long, max_dist: $max_dist, tier: $tier) {
                                itemID merchantID name merchant_name status
                                quantity original_price price distance description
                            }
                        }
                    `;
                    const variables = {
                        lat:      user?.lat  ? parseFloat(user.lat)  : null,
                        long:     user?.long ? parseFloat(user.long) : null,
                        max_dist: maxDist    ? parseFloat(maxDist)   : null,
                        tier:     user?.tier || 'free',
                    };
                    const response = await fetch('http://localhost:8000/graphql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query, variables }),
                    });
                    if (response.ok) {
                        const jsonResponse = await response.json();
                        setItems(jsonResponse.data?.listings || []);
                    }
                } catch (error) {
                    console.error('Failed to fetch listings via GraphQL:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchItems();
        }
    }, [activeTab, user?.lat, user?.long, user?.tier, maxDist]);

    const isGuest = !user;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar
                currentView={currentView}
                user={user}
                onOpenLogin={onOpenLogin}
                onLogout={onLogout}
                onGoHome={onGoHome}
                onGoProfile={onGoProfile}
            />

            {/* ══════════════════════════════════════════
                GUEST SECTIONS
            ══════════════════════════════════════════ */}
            {isGuest && (
                <div className="ch" style={{ background: '#fafaf8', fontFamily: "'DM Sans', sans-serif" }}>
                    <HeroStyles />

                    {/* ── 1. HERO ── */}
                    <section style={{
                        position: 'relative',
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: '120px 72px 80px',
                    }}>
                        <div className="ch-blob" style={{ width: 420, height: 420, top: '10%', left: '38%', background: 'rgba(249,115,22,0.09)' }} />
                        <div className="ch-blob" style={{ width: 280, height: 280, top: '55%', left: '58%', background: 'rgba(249,115,22,0.05)', animationDelay: '-3.5s', animationDuration: '9s' }} />
                        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: '#f97316', opacity: 0.10, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: 100, left: 72, width: 12, height: 12, borderRadius: '50%', background: '#f97316' }} />

                        <div className="fade-up-1" style={{ position: 'absolute', top: 52, left: 72, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', color: '#f97316' }}>
                                Live flash sales active
                            </span>
                        </div>

                        <div style={{ position: 'relative', zIndex: 10, marginBottom: 56 }}>
                            <span className="ch-title ch-title-solid fade-up-2"  style={{ fontSize: 'clamp(68px, 12vw, 150px)' }}>rescue</span>
                            <span className="ch-title ch-title-outline fade-up-3" style={{ fontSize: 'clamp(68px, 12vw, 150px)' }}>great</span>
                            <span className="ch-title ch-title-orange fade-up-4"  style={{ fontSize: 'clamp(68px, 12vw, 150px)' }}>food.</span>
                        </div>

                        <div className="fade-up-5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'end', position: 'relative', zIndex: 10, maxWidth: 960 }}>
                            <div>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(14px, 1.4vw, 17px)', fontWeight: 300, color: '#444', lineHeight: 1.8, maxWidth: 480, marginBottom: 36 }}>
                                    This isn't fast food or overpriced delivery — this is about rescuing premium surplus
                                    from top restaurants before it goes to waste. Pay less. Eat well. Waste nothing.
                                </p>
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                    <button className="ch-btn-primary" onClick={onOpenLogin}>Shop Now</button>
                                    <button className="ch-btn-ghost">How It Works</button>
                                </div>
                            </div>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(13px, 1.1vw, 15px)', fontWeight: 300, color: '#888', lineHeight: 1.85 }}>
                                Premium surplus from top restaurants — claimed before it goes to waste.
                                We believe a smart platform and a fresh approach is how you eat better
                                and help reduce food waste around you.
                            </div>
                        </div>

                        <div style={{ position: 'absolute', bottom: 40, right: 72, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.35 }}>
                            <span style={{ fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>Scroll</span>
                            <div style={{ width: 40, height: 1, background: '#1a1a1a' }} />
                        </div>
                    </section>

                    {/* ── 2. MISSION STRIP ── */}
                    <div className="ch-mission">
                        <div className="ch-mission-inner">
                            <div className="ch-mission-label">
                                Our mission<br />Singapore, 2026
                            </div>
                            <div className="ch-mission-headline">
                                Good food shouldn't<br />
                                <span style={{ color: '#f97316', fontStyle: 'italic' }}>go to waste.</span>
                            </div>
                            <div className="ch-mission-body">
                                Every day, restaurants throw away perfectly good food. We built ChompChomp
                                to fix that — connecting conscious eaters with great surplus meals at a
                                fraction of the price. Better for your wallet. Better for the planet.
                            </div>
                        </div>
                    </div>

                    {/* ── 3. HOW IT WORKS ── */}
                    <section style={{ background: '#fafaf8', padding: '110px 72px' }}>
                        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 64, flexWrap: 'wrap', gap: 24 }}>
                                <div>
                                    <div className="ch-section-label">How It Works</div>
                                    <h2 className="ch-section-title" style={{ fontSize: 'clamp(38px, 5vw, 64px)' }}>
                                        Three steps.<br />
                                        <span style={{ color: '#f97316', fontStyle: 'italic' }}>Zero waste.</span>
                                    </h2>
                                </div>
                                <p style={{ maxWidth: 320, fontSize: 14, fontWeight: 300, color: '#888', lineHeight: 1.85 }}>
                                    From kitchen surplus to your hands in minutes. Simple, fast, and better for everyone.
                                </p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
                                {HOW_IT_WORKS.map((item, i) => (
                                    <div key={i} className="ch-step">
                                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 72, fontWeight: 900, color: 'rgba(249,115,22,0.28)', lineHeight: 1, marginBottom: 16, userSelect: 'none' }}>{item.step}</div>
                                        <div style={{ width: 44, height: 44, background: '#fff7ed', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', marginBottom: 18 }}>
                                            {item.icon}
                                        </div>
                                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 21, color: '#1a1a1a', marginBottom: 12, lineHeight: 1.2 }}>{item.title}</h3>
                                        <p style={{ fontSize: 14, fontWeight: 300, color: '#888', lineHeight: 1.85 }}>{item.desc}</p>
                                        <div className="ch-step-underline" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── 4. FREE VS PREMIUM ── */}
                    <section style={{ background: '#fff', padding: '110px 72px' }}>
                        <div style={{ maxWidth: 860, margin: '0 auto' }}>
                            <div style={{ marginBottom: 56 }}>
                                <div className="ch-section-label">Membership</div>
                                <h2 className="ch-section-title" style={{ fontSize: 'clamp(38px, 5vw, 64px)' }}>
                                    Free vs{' '}
                                    <span style={{ color: '#f97316', fontStyle: 'italic' }}>Premium.</span>
                                </h2>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300, color: '#888', lineHeight: 1.8, marginTop: 12, maxWidth: 480 }}>
                                    Upgrade for early access and never miss a drop again.
                                </p>
                            </div>
                            <div style={{ border: '1px solid #ececec', overflow: 'hidden' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#fafaf8', borderBottom: '1px solid #ececec' }}>
                                    {['Feature', 'Free', 'Premium'].map((h, i) => (
                                        <div key={i} style={{ padding: '16px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: i === 2 ? '#f97316' : '#aaa', textAlign: i === 0 ? 'left' : 'center' }}>{h}</div>
                                    ))}
                                </div>
                                {TIERS.map((row, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: i < TIERS.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                        <div style={{ padding: '18px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400, color: '#444' }}>{row.label}</div>
                                        <div style={{ padding: '18px 24px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                                            {typeof row.free === 'boolean'
                                                ? (row.free ? <span style={{ color: '#f97316', fontWeight: 600 }}>✓</span> : <span style={{ color: '#ddd' }}>✗</span>)
                                                : <span style={{ color: '#aaa', fontSize: 12 }}>{row.free}</span>}
                                        </div>
                                        <div style={{ padding: '18px 24px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                                            {typeof row.premium === 'boolean'
                                                ? (row.premium ? <span style={{ color: '#f97316', fontWeight: 700 }}>✓</span> : <span style={{ color: '#ddd' }}>✗</span>)
                                                : <span style={{ color: '#f97316', fontSize: 12, fontWeight: 600 }}>{row.premium}</span>}
                                        </div>
                                    </div>
                                ))}
                                <div style={{ padding: '28px 24px', background: '#fff7ed', borderTop: '1px solid #fed7aa', textAlign: 'center' }}>
                                    <button className="ch-btn-primary" onClick={onOpenLogin}>Get started free</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 5. LIVE LISTINGS PREVIEW ── */}
                    <section style={{ background: '#fafaf8', padding: '110px 72px' }}>
                        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 56, flexWrap: 'wrap', gap: 24 }}>
                                <div>
                                    <div className="ch-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                                        Live right now
                                    </div>
                                    <h2 className="ch-section-title" style={{ fontSize: 'clamp(38px, 5vw, 64px)' }}>
                                        Today's{' '}
                                        <span style={{ color: '#f97316', fontStyle: 'italic' }}>drop.</span>
                                    </h2>
                                </div>
                                <button className="ch-btn-primary" onClick={onOpenLogin}>See all listings →</button>
                            </div>
                            {loading ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="h-1.5 skeleton" /><div className="p-6 space-y-4">
                                            <div className="h-3 skeleton rounded-full w-1/3" /><div className="h-5 skeleton rounded-full w-2/3" />
                                            <div className="h-3 skeleton rounded-full w-1/4" /></div>
                                        </div>
                                    ))}
                                </div>
                            ) : items.length === 0 ? (
                                <div style={{ background: '#fff', border: '1px solid #ececec', padding: '80px 24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 40, marginBottom: 16 }}>🕐</div>
                                    <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20, color: '#1a1a1a', marginBottom: 8 }}>No listings right now</p>
                                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#aaa' }}>Sign up to get notified the moment new drops go live.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                                    {items.slice(0, 3).map((product, idx) => (
                                        <div key={product.itemID} className="group bg-white rounded-2xl border border-slate-100 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden animate-fade-up" style={{ animationDelay: `${idx * 0.07}s`, boxShadow: '0 10px 30px rgba(0,0,0,0.07)' }}>
                                            <div className="h-1.5 bg-gradient-to-r from-orange-400 to-amber-500" />
                                            <div className="h-48 overflow-hidden relative">
                                                <img src={getCategoryImage(product.name)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                            </div>
                                            <div className="p-6 flex flex-col flex-grow">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{product.merchant_name}</p>
                                                    {product.distance != null && (
                                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                                            {product.distance} km
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-xl font-display font-semibold text-slate-900 leading-snug mb-4">{formatName(product.name)}</h3>
                                                <div className="mb-5">
                                                    {product.quantity > 0
                                                        ? <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${product.quantity <= 3 ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>{product.quantity} AVAILABLE</span>
                                                        : <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-slate-50 text-slate-300 border border-slate-100">SOLD OUT</span>
                                                    }
                                                </div>
                                                <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-2xl font-bold text-slate-900">${product.price?.toFixed(2) || '0.00'}</span>
                                                        <span className="text-sm text-slate-400 line-through">${product.original_price?.toFixed(2) || '0.00'}</span>
                                                    </div>
                                                    <button className="ch-btn-primary" style={{ padding: '10px 20px', fontSize: 10, letterSpacing: '1.5px' }} onClick={onOpenLogin}>Buy</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── 6. FAQ ── */}
                    <section style={{ background: '#fff', padding: '110px 72px' }}>
                        <div style={{ maxWidth: 860, margin: '0 auto' }}>
                            <div style={{ marginBottom: 56 }}>
                                <div className="ch-section-label">FAQ</div>
                                <h2 className="ch-section-title" style={{ fontSize: 'clamp(38px, 5vw, 64px)' }}>
                                    Frequently{' '}
                                    <span style={{ color: '#f97316', fontStyle: 'italic' }}>asked.</span>
                                </h2>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300, color: '#888', lineHeight: 1.8, marginTop: 12, maxWidth: 440 }}>
                                    Everything you need to know before your first rescue.
                                </p>
                            </div>
                            <div>
                                {FAQS.map((faq, i) => (
                                    <div key={i} className="ch-faq-item">
                                        <button className="ch-faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                            <span className="ch-faq-q">{faq.q}</span>
                                            <span className="ch-faq-icon" style={{ borderColor: openFaq === i ? '#f97316' : '#e5e5e5', color: openFaq === i ? '#f97316' : '#888' }}>
                                                {openFaq === i ? '−' : '+'}
                                            </span>
                                        </button>
                                        {openFaq === i && <div className="ch-faq-answer">{faq.a}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── 7. BOTTOM CTA ── */}
                    <section style={{ background: '#1a1a1a', padding: '110px 72px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(100px, 18vw, 220px)', letterSpacing: '-6px', color: 'transparent', WebkitTextStroke: '1.5px rgba(249,115,22,0.12)', whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>
                            CHOMP.
                        </div>
                        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
                            <div className="ch-section-label" style={{ textAlign: 'center', color: '#f97316' }}>Join The Movement</div>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(38px, 6vw, 76px)', letterSpacing: '-2.5px', lineHeight: 1.0, color: '#fff', marginBottom: 20 }}>
                                Rescue food.<br />
                                <span style={{ color: '#f97316', fontStyle: 'italic' }}>Start today.</span>
                            </h2>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.4)', maxWidth: 360, margin: '0 auto 40px', lineHeight: 1.8 }}>
                                Premium members get 10-minute early access to every new listing drop.
                            </p>
                            <button className="ch-btn-primary" onClick={onOpenLogin} style={{ padding: '18px 56px', fontSize: 12 }}>
                                Create Free Account
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {/* ══════════════════════════════════════════
                LOGGED-IN MAIN CONTENT
            ══════════════════════════════════════════ */}
            <main className={`${isGuest ? '' : 'pt-32 pb-24'} px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto`}>
                {!isGuest && (
                    <div className="flex space-x-8 mb-10 border-b border-slate-200">
                        <button onClick={() => setActiveTab('browse')} className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'browse' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                            Listings
                            {activeTab === 'browse' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-full" />}
                        </button>
                        <button onClick={() => setActiveTab('orders')} className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'orders' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                            My Orders
                            {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-full" />}
                        </button>
                    </div>
                )}

                {activeTab === 'browse' && !isGuest && (
                    <>
                        <div className="flex flex-wrap items-center gap-4 mb-10">
                            <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 bg-orange-500 rounded-full animate-pulse" />
                                <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-slate-900">The Daily Drop</h2>
                            </div>
                            {user?.role === 'user' && (
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all ${user?.tier === 'premium' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                    {user?.tier === 'premium' ? 'Premium' : 'Regular'}
                                </span>
                            )}
                            {(user?.lat || user?.postal_code) && (
                                <div className="flex-grow flex justify-end items-center gap-4">
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Search listings..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 w-64"
                                        />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-400">Within</span>
                                    <select value={maxDist || ''} onChange={(e) => setMaxDist(e.target.value ? Number(e.target.value) : null)} className="bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 py-1.5 px-3 outline-none focus:border-orange-500">
                                        <option value="">Any distance</option>
                                        <option value="2">2 km</option>
                                        <option value="5">5 km</option>
                                        <option value="10">10 km</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="h-1.5 skeleton" /><div className="p-6 space-y-4">
                                        <div className="h-3 skeleton rounded-full w-1/3" /><div className="h-5 skeleton rounded-full w-2/3" />
                                        <div className="h-3 skeleton rounded-full w-1/4" /><div className="pt-4 flex justify-between items-end">
                                        <div className="space-y-2"><div className="h-3 skeleton rounded-full w-16" /><div className="h-7 skeleton rounded-full w-20" /></div>
                                        <div className="h-10 w-20 skeleton rounded-xl" /></div></div>
                                    </div>
                                ))}
                            </div>
                        ) : (() => {
                            const filteredItems = items.filter(item => {
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                return (
                                    item.name?.toLowerCase().includes(query) ||
                                    item.merchant_name?.toLowerCase().includes(query) ||
                                    item.description?.toLowerCase().includes(query)
                                );
                            });
                            return filteredItems.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center px-4 shadow-sm">
                                    <div className="text-4xl mb-4">🔍</div>
                                    <p className="text-slate-700 font-semibold mb-1">{searchQuery ? 'No listings match your search' : 'No listings right now'}</p>
                                    <p className="text-slate-400 text-sm">{searchQuery ? 'Try adjusting your search terms or filters.' : (user?.tier !== 'premium' ? 'Premium members get early access — upgrade to see listings first.' : "Check back soon for today's drop.")}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {filteredItems.map((product, idx) => (
                                    <div key={product.itemID} className="group bg-white rounded-2xl border border-slate-100 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden animate-fade-up" style={{ animationDelay: `${idx * 0.07}s`, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                                        <div className="h-1.5 bg-gradient-to-r from-orange-400 to-amber-500" />
                                        <div className="h-48 overflow-hidden relative">
                                            <img src={getCategoryImage(product.name)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                        </div>
                                        <div className="p-6 flex flex-col flex-grow">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{product.merchant_name}</p>
                                                {product.distance != null && (
                                                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                                        {product.distance} km
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-display font-semibold text-slate-900 leading-snug mb-4">{formatName(product.name)}</h3>
                                            <div className="mb-5">
                                                {product.quantity > 0
                                                    ? <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${product.quantity <= 3 ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>{product.quantity} AVAILABLE</span>
                                                    : <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-slate-50 text-slate-300 border border-slate-100">SOLD OUT</span>
                                                }
                                            </div>
                                            <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-2xl font-bold text-slate-900">${product.price?.toFixed(2) || '0.00'}</span>
                                                    <span className="text-sm text-slate-400 line-through">${product.original_price?.toFixed(2) || '0.00'}</span>
                                                </div>
                                                <Button variant="primary" className="rounded-xl px-5 py-2.5 text-sm font-semibold" onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!user) { onOpenLogin(); return; }
                                                    const savedRes = localStorage.getItem(`res_${user.email}_${product.itemID}`);
                                                    if (savedRes) {
                                                        try {
                                                            const { data, expiresAt } = JSON.parse(savedRes);
                                                            if (expiresAt > Date.now()) {
                                                                setSelectedBox(product); setCheckoutQuantity(data.quantity || 1);
                                                                setCheckoutType(data.deliveryType || 'pickup'); setCheckoutTotal(data.total_paid || 0);
                                                                setIsCheckoutModalOpen(true); return;
                                                            } else { localStorage.removeItem(`res_${user.email}_${product.itemID}`); }
                                                        } catch (err) { console.error('Invalid saved reservation:', err); localStorage.removeItem(`res_${user.email}_${product.itemID}`); }
                                                    }
                                                    setSelectedBox(product); setIsDetailModalOpen(true);
                                        }}>Buy</Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            );
                        })()}
                    </>
                )}

                {activeTab === 'orders' && !isGuest && (
                    <>
                        <div className="mb-10">
                            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-slate-900 mb-2">Active & Past Orders</h2>
                            <p className="text-slate-400 text-sm">Track your current rescues and view your contribution history.</p>
                        </div>
                        <MyOrdersList user={user} onViewOrder={onViewOrderStatus} />
                    </>
                )}
            </main>

            {/* Modals */}
            <BoxDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                box={selectedBox}
                onConfirm={(box, deliveryType, total, quantity) => {
                    setCheckoutType(deliveryType); setCheckoutTotal(total); setCheckoutQuantity(quantity);
                    setIsDetailModalOpen(false); setIsCheckoutModalOpen(true);
                }}
            />
            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                box={selectedBox}
                user={user}
                deliveryType={checkoutType}
                total={checkoutTotal}
                quantity={checkoutQuantity}
                onPaymentSuccess={(orderId) => { setIsCheckoutModalOpen(false); onViewOrderStatus(orderId); }}
            />

            {/* ── FOOTER ── */}
            <footer style={{ borderTop: '1.5px solid #1a1a1a', background: '#fafaf8', marginTop: isGuest ? 0 : 40 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 72px 40px', fontFamily: "'DM Sans', sans-serif" }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 40, marginBottom: 56 }}>
                        <div style={{ maxWidth: 280 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <div style={{ width: 32, height: 32, background: '#f97316', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg style={{ width: 16, height: 16, color: '#fff' }} fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
                                    </svg>
                                </div>
                                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 18, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
                                    Chomp<span style={{ color: '#f97316' }}>Chomp</span>
                                </span>
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 300, color: '#888', lineHeight: 1.8 }}>
                                Rescuing surplus food from great restaurants across Singapore. Less waste, more taste.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#aaa', marginBottom: 16 }}>Product</p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {['Browse listings', 'Sign up free', 'Premium'].map(l => (
                                        <li key={l}><button onClick={onOpenLogin} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#f97316'} onMouseLeave={e => e.currentTarget.style.color = '#555'}>{l}</button></li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#aaa', marginBottom: 16 }}>For merchants</p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {['Partner with us', 'Merchant dashboard'].map(l => (
                                        <li key={l}><button onClick={onOpenLogin} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#f97316'} onMouseLeave={e => e.currentTarget.style.color = '#555'}>{l}</button></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid #ececec', paddingTop: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <p style={{ fontSize: 12, color: '#bbb', fontWeight: 300 }}>© 2026 ChompChomp. All rights reserved.</p>
                        <p style={{ fontSize: 12, color: '#bbb', fontWeight: 300 }}>Made with care to reduce food waste in Singapore 🌿</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;