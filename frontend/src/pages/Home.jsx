import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import BoxDetailModal from '../components/BoxDetailModal';
import CheckoutModal from '../components/CheckoutModal';
import MyOrdersList from '../components/MyOrdersList';

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
    { label: 'Listing access', free: 'Delayed (after 7PM)', premium: 'Early access (from 5PM)' },
    { label: 'SMS alerts for new drops', free: false, premium: true },
    { label: 'Distance filtering', free: true, premium: true },
    { label: 'Order history', free: true, premium: true },
    { label: 'Priority support', free: false, premium: true },
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

const Home = ({ currentView, user, onOpenLogin, onLogout, onGoHome, onViewOrderStatus, onGoProfile }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBox, setSelectedBox] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutType, setCheckoutType] = useState('pickup');
    const [checkoutTotal, setCheckoutTotal] = useState(0);
    const [checkoutQuantity, setCheckoutQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('browse');
    const [maxDist, setMaxDist] = useState(null);
    const [openFaq, setOpenFaq] = useState(null);

    const getCategoryImage = (name) => {
        const displayName = name || '';
        const match = displayName.match(/^\[([A-Z]+)\]/);
        const category = match ? match[1].toLowerCase() : 'others';
        
        const validCategories = ['bakery', 'meals', 'drinks', 'desserts', 'healthy', 'proteins', 'others'];
        return validCategories.includes(category) ? `/category-${category}.png` : '/category-others.png';
    };

    const formatName = (name) => {
        return (name || '').replace(/^\[[A-Z]+\]\s*/, '');
    };

    useEffect(() => {
        if (activeTab === 'browse') {
            const fetchItems = async () => {
                setLoading(true);
                try {
                    const query = `
                        query GetListings($lat: Float, $long: Float, $max_dist: Float, $tier: String) {
                            listings(lat: $lat, long: $long, max_dist: $max_dist, tier: $tier) {
                                itemID
                                merchantID
                                name
                                merchant_name
                                status
                                quantity
                                original_price
                                price
                                distance
                                description
                            }
                        }
                    `;

                    const variables = {
                        lat: user?.lat ? parseFloat(user.lat) : null,
                        long: user?.long ? parseFloat(user.long) : null,
                        max_dist: maxDist ? parseFloat(maxDist) : null,
                        tier: user?.tier || 'free'
                    };

                    const response = await fetch('http://localhost:8000/graphql', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ query, variables })
                    });

                    if (response.ok) {
                        const jsonResponse = await response.json();
                        setItems(jsonResponse.data?.listings || []);
                    }
                } catch (error) {
                    console.error("Failed to fetch listings via GraphQL:", error);
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
            <Navbar currentView={currentView} user={user} onOpenLogin={onOpenLogin} onLogout={onLogout} onGoHome={onGoHome} onGoProfile={onGoProfile} />

            {/* Hero Section - Only for Guests */}
            {isGuest && (
                <section className="relative pt-28 pb-20 lg:pt-40 lg:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
                    {/* Glow effect */}
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            width: '500px',
                            height: '500px',
                            background: 'rgba(234, 88, 12, 0.08)',
                            filter: 'blur(120px)',
                            top: '-100px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            borderRadius: '50%',
                        }}
                    />
                    <div className="relative flex flex-col items-center text-center">
                        <span className="animate-fade-up inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-semibold px-4 py-2 rounded-full border border-orange-200 mb-6">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                            Live Flash Sales Now Available
                        </span>
                        <h1 className="animate-fade-up-delay-1 text-5xl md:text-7xl font-display font-semibold text-slate-900 mb-6">
                            Rescue great food.<br />
                            <span className="text-orange-500">Pay less. Waste nothing.</span>
                        </h1>
                        <p className="animate-fade-up-delay-2 text-slate-500 text-base max-w-xl mb-10">
                            Premium surplus from top restaurants — claimed before it goes to waste.
                        </p>
                        <div className="animate-fade-up-delay-3">
                            <Button onClick={onOpenLogin} variant="primary" className="px-10 py-4 text-base rounded-2xl font-semibold">
                                Shop Now
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* How It Works - Guests only */}
            {isGuest && (
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-3">How it works</h2>
                        <p className="text-slate-400 text-sm max-w-md mx-auto">Three steps to rescue great food at a fraction of the price.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {HOW_IT_WORKS.map((item) => (
                            <div key={item.step} className="relative bg-white rounded-2xl p-8 border border-slate-100" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
                                <span className="absolute top-6 right-6 text-xs font-bold text-slate-200">{item.step}</span>
                                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 mb-5">
                                    {item.icon}
                                </div>
                                <h3 className="text-lg font-display font-semibold text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Tier Comparison - Guests only */}
            {isGuest && (
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-3">Free vs Premium</h2>
                        <p className="text-slate-400 text-sm">Upgrade for early access and never miss a drop again.</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
                        <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wide">
                            <div className="p-4">Feature</div>
                            <div className="p-4 text-center">Free</div>
                            <div className="p-4 text-center text-orange-500">Premium</div>
                        </div>
                        {TIERS.map((row, i) => (
                            <div key={i} className={`grid grid-cols-3 text-sm ${i < TIERS.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                <div className="p-4 text-slate-600 font-medium">{row.label}</div>
                                <div className="p-4 text-center">
                                    {typeof row.free === 'boolean' ? (
                                        row.free ? <span className="text-orange-500">✓</span> : <span className="text-slate-300">✗</span>
                                    ) : (
                                        <span className="text-slate-400 text-xs">{row.free}</span>
                                    )}
                                </div>
                                <div className="p-4 text-center">
                                    {typeof row.premium === 'boolean' ? (
                                        row.premium ? <span className="text-orange-500 font-bold">✓</span> : <span className="text-slate-300">✗</span>
                                    ) : (
                                        <span className="text-orange-600 text-xs font-semibold">{row.premium}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className="p-6 bg-orange-50 border-t border-orange-100 text-center">
                            <Button onClick={onOpenLogin} variant="primary" className="px-8 py-3 text-sm rounded-xl font-semibold">
                                Get started free
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* FAQ - Guests only */}
            {isGuest && (
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-3">Frequently asked</h2>
                        <p className="text-slate-400 text-sm">Everything you need to know before your first rescue.</p>
                    </div>
                    <div className="space-y-3">
                        {FAQS.map((faq, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                                <button
                                    className="w-full flex items-center justify-between p-6 text-left"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span className="font-semibold text-slate-900 text-sm pr-4">{faq.q}</span>
                                    <svg
                                        className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 text-sm text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Main Content Area */}
            <main className={`${isGuest ? 'py-20' : 'pt-32 pb-24'} px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto`}>

                {/* Tabs */}
                {!isGuest && (
                    <div className="flex space-x-8 mb-10 border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('browse')}
                            className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'browse' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Listings
                            {activeTab === 'browse' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'orders' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            My Orders
                            {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-full"></div>}
                        </button>
                    </div>
                )}

                {activeTab === 'browse' ? (
                    <>
                        <div className="flex flex-wrap items-center gap-4 mb-10">
                            <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 bg-orange-500 rounded-full animate-pulse"></div>
                                <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-slate-900">
                                    {isGuest ? 'Live Flash Sales' : 'The Daily Drop'}
                                </h2>
                            </div>

                            {!isGuest && user?.role === 'user' && (
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all ${
                                    user?.tier === 'premium'
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                                }`}>
                                    {user?.tier === 'premium' ? 'Premium' : 'Regular'}
                                </span>
                            )}

                            {!isGuest && (user?.lat || user?.postal_code) && (
                                <div className="flex-grow flex justify-end items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-400">Within</span>
                                    <select
                                        value={maxDist || ''}
                                        onChange={(e) => setMaxDist(e.target.value ? Number(e.target.value) : null)}
                                        className="bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 py-1.5 px-3 outline-none focus:border-orange-500"
                                    >
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
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="h-1.5 skeleton"></div>
                                        <div className="p-6 space-y-4">
                                            <div className="h-3 skeleton rounded-full w-1/3"></div>
                                            <div className="h-5 skeleton rounded-full w-2/3"></div>
                                            <div className="h-3 skeleton rounded-full w-1/4"></div>
                                            <div className="pt-4 flex justify-between items-end">
                                                <div className="space-y-2">
                                                    <div className="h-3 skeleton rounded-full w-16"></div>
                                                    <div className="h-7 skeleton rounded-full w-20"></div>
                                                </div>
                                                <div className="h-10 w-20 skeleton rounded-xl"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center px-4 shadow-sm">
                                <div className="text-4xl mb-4">🕐</div>
                                <p className="text-slate-700 font-semibold mb-1">No listings right now</p>
                                <p className="text-slate-400 text-sm">
                                    {user?.tier !== 'premium'
                                        ? 'Premium members get early access — upgrade to see listings first.'
                                        : 'Check back soon for today\'s drop.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {items.map((product, idx) => (
                                    <div key={product.itemID} className="group bg-white rounded-2xl border border-slate-100 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden animate-fade-up" style={{ animationDelay: `${idx * 0.07}s`, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                                        {/* Card top color band */}
                                        <div className="h-1.5 bg-gradient-to-r from-orange-400 to-amber-500"></div>

                                        {/* Category Image */}
                                        <div className="h-48 overflow-hidden relative">
                                            <img 
                                                src={getCategoryImage(product.name)} 
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                        </div>

                                        <div className="p-6 flex flex-col flex-grow">
                                            {/* Row 1: Merchant + Distance */}
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{product.merchant_name}</p>
                                                {product.distance !== undefined && product.distance !== null && (
                                                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                                        {product.distance} km
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Row 2: Item name */}
                                            <h3 className="text-xl font-display font-semibold text-slate-900 leading-snug mb-4">{formatName(product.name)}</h3>

                                            {/* Row 3: Availability */}
                                            <div className="mb-5">
                                                {product.quantity > 0 ? (
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                                                        product.quantity <= 3 
                                                            ? 'bg-orange-600 text-white shadow-sm' 
                                                            : 'bg-slate-50 text-slate-500 border border-slate-100'
                                                    }`}>
                                                        {product.quantity} AVAILABLE
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-slate-50 text-slate-300 border border-slate-100">
                                                        SOLD OUT
                                                    </span>
                                                )}
                                            </div>

                                            {/* Row 4: Price + Buy */}
                                            <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between">
                                                <div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-2xl font-bold text-slate-900">${product.price?.toFixed(2) || '0.00'}</span>
                                                        <span className="text-sm text-slate-400 line-through">${product.original_price?.toFixed(2) || '0.00'}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="primary"
                                                    className="rounded-xl px-5 py-2.5 text-sm font-semibold"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!user) {
                                                            onOpenLogin();
                                                            return;
                                                        }

                                                        const savedRes = localStorage.getItem(`res_${user.email}_${product.itemID}`);
                                                        if (savedRes) {
                                                            try {
                                                                const { data, expiresAt } = JSON.parse(savedRes);
                                                                if (expiresAt > Date.now()) {
                                                                    setSelectedBox(product);
                                                                    setCheckoutQuantity(data.quantity || 1);
                                                                    setCheckoutType(data.deliveryType || 'pickup');
                                                                    setCheckoutTotal(data.total_paid || 0);
                                                                    setIsCheckoutModalOpen(true);
                                                                    return;
                                                                } else {
                                                                    localStorage.removeItem(`res_${user.email}_${product.itemID}`);
                                                                }
                                                            } catch (err) {
                                                                console.error("Invalid saved reservation:", err);
                                                                localStorage.removeItem(`res_${user.email}_${product.itemID}`);
                                                            }
                                                        }

                                                        setSelectedBox(product);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                >
                                                    Buy
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="mb-10">
                            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-slate-900 mb-2">Active & Past Orders</h2>
                            <p className="text-slate-400 text-sm">Track your current rescues and view your contribution history.</p>
                        </div>
                        <MyOrdersList user={user} onViewOrder={onViewOrderStatus} />
                    </>
                )}
            </main>

            {/* Detail Modal */}
            <BoxDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                box={selectedBox}
                onConfirm={(box, deliveryType, total, quantity) => {
                    setCheckoutType(deliveryType);
                    setCheckoutTotal(total);
                    setCheckoutQuantity(quantity);
                    setIsDetailModalOpen(false);
                    setIsCheckoutModalOpen(true);
                }}
            />

            {/* Checkout Modal */}
            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                box={selectedBox}
                user={user}
                deliveryType={checkoutType}
                total={checkoutTotal}
                quantity={checkoutQuantity}
                onPaymentSuccess={(orderId) => {
                    setIsCheckoutModalOpen(false);
                    onViewOrderStatus(orderId);
                }}
            />
            {/* Footer */}
            <footer className="border-t border-slate-100 bg-white mt-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
                                    </svg>
                                </div>
                                <span className="font-display font-semibold text-slate-900">Chomp<span className="text-orange-500">Chomp</span></span>
                            </div>
                            <p className="text-xs text-slate-400 max-w-xs">Rescuing surplus food from great restaurants across Singapore. Less waste, more taste.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-8 text-sm text-slate-400">
                            <div className="space-y-2">
                                <p className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Product</p>
                                <ul className="space-y-1.5">
                                    <li><button onClick={onOpenLogin} className="hover:text-slate-700 transition-colors">Browse listings</button></li>
                                    <li><button onClick={onOpenLogin} className="hover:text-slate-700 transition-colors">Sign up free</button></li>
                                    <li><button onClick={onOpenLogin} className="hover:text-slate-700 transition-colors">Premium</button></li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <p className="font-semibold text-slate-600 text-xs uppercase tracking-wide">For merchants</p>
                                <ul className="space-y-1.5">
                                    <li><button onClick={onOpenLogin} className="hover:text-slate-700 transition-colors">Partner with us</button></li>
                                    <li><button onClick={onOpenLogin} className="hover:text-slate-700 transition-colors">Merchant dashboard</button></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-slate-400">© 2026 ChompChomp. All rights reserved.</p>
                        <p className="text-xs text-slate-400">Made with care to reduce food waste in Singapore 🌿</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
