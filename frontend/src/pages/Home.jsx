import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import BoxDetailModal from '../components/BoxDetailModal';
import CheckoutModal from '../components/CheckoutModal';
import MyOrdersList from '../components/MyOrdersList';

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
                            background: 'rgba(22, 163, 74, 0.08)',
                            filter: 'blur(120px)',
                            top: '-100px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            borderRadius: '50%',
                        }}
                    />
                    <div className="relative flex flex-col items-center text-center">
                        <span className="animate-fade-up inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-4 py-2 rounded-full border border-green-200 mb-6">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Live Flash Sales Now Available
                        </span>
                        <h1 className="animate-fade-up-delay-1 text-5xl md:text-7xl font-display font-semibold text-slate-900 mb-6">
                            Rescue great food.<br />
                            <span className="text-green-600">Pay less. Waste nothing.</span>
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
                            {activeTab === 'browse' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'orders' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            My Orders
                            {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-full"></div>}
                        </button>
                    </div>
                )}

                {activeTab === 'browse' ? (
                    <>
                        <div className="flex flex-wrap items-center gap-4 mb-10">
                            <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse"></div>
                                <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-slate-900">
                                    {isGuest ? 'Live Flash Sales' : 'The Daily Drop'}
                                </h2>
                            </div>

                            {!isGuest && user?.role === 'user' && (
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    user?.tier === 'premium'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {user?.tier === 'premium' ? 'Premium — Early Access' : 'Free — Delayed Access'}
                                </span>
                            )}

                            {!isGuest && user?.lat && (
                                <div className="flex-grow flex justify-end items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-400">Within</span>
                                    <select
                                        value={maxDist || ''}
                                        onChange={(e) => setMaxDist(e.target.value ? Number(e.target.value) : null)}
                                        className="bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 py-1.5 px-3 outline-none focus:border-green-500"
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
                                        <div className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-500"></div>

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
                                            <h3 className="text-xl font-display font-semibold text-slate-900 leading-snug mb-4">{product.name}</h3>

                                            {/* Row 3: Availability pill */}
                                            <div className="mb-5">
                                                {product.quantity > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                        {product.quantity} available
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                                                        Sold out
                                                    </span>
                                                )}
                                            </div>

                                            {/* Row 4: Price + Buy */}
                                            <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between">
                                                <div>
                                                    <p className="text-xs text-slate-400 font-medium mb-0.5">Price drop</p>
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
        </div>
    );
};

export default Home;
