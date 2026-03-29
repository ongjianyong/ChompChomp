import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import Card from '../components/Card';
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
                    // --- GRAPHQL (Scenario 2 BTL) ---
                    // Eliminating REST over-fetching by specifying exact fields needed for the UI
                    const query = `
                        query GetListings($lat: Float, $long: Float, $maxDist: Float, $tier: String) {
                            listings(lat: $lat, long: $long, maxDist: $maxDist, tier: $tier) {
                                itemID
                                name
                                merchantName
                                status
                                quantity
                                originalPrice
                                price
                                distance
                            }
                        }
                    `;
                    
                    const variables = {
                        lat: user?.lat ? parseFloat(user.lat) : null,
                        long: user?.long ? parseFloat(user.long) : null,
                        maxDist: maxDist ? parseFloat(maxDist) : null,
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
                        // Graphene changes snake_case 'merchant_name' to camelCase 'merchantName' automatically
                        const formattedItems = (jsonResponse.data?.listings || []).map(item => ({
                            ...item,
                            merchant_name: item.merchantName,
                            original_price: item.originalPrice
                        }));
                        setItems(formattedItems);
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
        <div className="min-h-screen bg-white">
            <Navbar currentView={currentView} user={user} onOpenLogin={onOpenLogin} onLogout={onLogout} onGoHome={onGoHome} onGoProfile={onGoProfile} />

            {/* Hero Section - Only for Guests */}
            {isGuest && (
                <section className="pt-24 pb-16 lg:pt-36 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
                    <h1 className="text-5xl md:text-7xl font-display font-medium tracking-tight text-black mb-6">
                        Rescue great food.<br />
                        Pay less. Waste nothing.
                    </h1>
                    <p className="text-gray-500 text-lg max-w-xl mb-10 font-sans font-light">
                        Premium surplus from top restaurants &mdash; claimed before it goes to waste.
                    </p>
                    <div className="flex justify-center">
                        <Button onClick={onOpenLogin} variant="primary" className="bg-black text-white hover:bg-gray-800 px-12 py-5 text-xl rounded-none">
                            Shop Now
                        </Button>
                    </div>
                </section>
            )}

            {/* Main Content Area */}
            <main className={`${isGuest ? 'py-24' : 'pt-32 pb-24'} px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto`}>

                {/* Tabs */}
                {!isGuest && (
                    <div className="flex space-x-12 mb-12 border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('browse')}
                            className={`pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'browse' ? 'text-black' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                            Listings
                            {activeTab === 'browse' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'orders' ? 'text-black' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                            My Orders
                            {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black"></div>}
                        </button>
                    </div>
                )}

                {activeTab === 'browse' ? (
                    <>
                        <div className="flex items-center space-x-4 mb-16">
                            <div className="flex items-center space-x-4">
                                <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse"></div>
                                <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tighter">
                                    {isGuest ? 'Live Flash Sales' : 'The Daily Drop'}
                                </h2>
                            </div>

                            {/* Tier badge — shows customer their access level */}
                            {!isGuest && user?.role === 'user' && (
                                <div className={`ml-4 px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                                    user?.tier === 'premium'
                                        ? 'bg-amber-50 border-amber-400 text-amber-600'
                                        : 'bg-gray-50 border-gray-300 text-gray-500'
                                }`}>
                                    {user?.tier === 'premium' ? '⚡ Premium — Early Access' : 'Free — Delayed Access'}
                                </div>
                            )}

                            {/* Distance Filter */}
                            {!isGuest && user?.lat && (
                                <div className="flex-grow flex justify-end items-center space-x-3">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Within</span>
                                    <select
                                        value={maxDist || ''}
                                        onChange={(e) => setMaxDist(e.target.value ? Number(e.target.value) : null)}
                                        className="bg-transparent border-b border-black text-xs font-bold uppercase tracking-widest py-1 outline-none"
                                    >
                                        <option value="">Any Distance</option>
                                        <option value="2">&lt; 2km</option>
                                        <option value="5">&lt; 5km</option>
                                        <option value="10">&lt; 10km</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="text-center py-20 grayscale opacity-50">Loading current listings...</div>
                        ) : items.length === 0 ? (
                            <div className="border border-gray-100 py-32 text-center text-gray-400 uppercase tracking-widest text-sm">
                                {user?.tier !== 'premium'
                                    ? 'No listings available yet. Premium members get early access — upgrade to see listings first.'
                                    : 'No active listings right now. Check back soon.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {items.map((product) => (
                                    <div key={product.itemID} className="group cursor-pointer flex flex-col h-full border border-gray-200 hover:border-black transition-colors">
                                        <Card className="bg-gray-100 aspect-square rounded-none flex items-center justify-center relative overflow-hidden">
                                            <img
                                                src={`https://images.unsplash.com/photo-1550617931-e17a7b70dce2?q=80&w=400&h=400`}
                                                alt={product.name}
                                                className="w-full h-full object-cover grayscale transition-transform duration-700 group-hover:scale-105 group-hover:grayscale-0"
                                            />
                                            <div className="absolute top-4 right-4 bg-white px-3 py-1 text-xs font-bold text-black border border-black rounded-none uppercase tracking-widest shadow-sm">
                                                {product.merchant_name}
                                            </div>
                                            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur px-4 py-2 text-xs font-bold text-white border border-white/20 rounded-none flex justify-between items-center">
                                                <span className="uppercase tracking-widest text-red-400">{product.status === 'available' ? 'Available' : 'Limited'}</span>
                                                <span>{product.quantity} LEFT</span>
                                            </div>
                                        </Card>
                                        <div className="p-6 flex flex-col flex-grow bg-white">
                                            <h3 className="text-xl font-medium text-black mb-1">{product.name}</h3>
                                            <p className="text-gray-500 text-sm mb-4">from {product.merchant_name}</p>

                                            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-400 line-through text-xs">${product.original_price?.toFixed(2) || '0.00'}</span>
                                                    <span className="text-black font-bold text-lg">${product.price?.toFixed(2) || '0.00'}</span>
                                                    {product.distance !== undefined && product.distance !== null && (
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                            📍 {product.distance}km away
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="primary"
                                                    className="bg-black text-white hover:bg-gray-800 rounded-none px-6 py-2 uppercase tracking-widest text-xs font-bold"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!user) {
                                                            onOpenLogin();
                                                            return;
                                                        }

                                                        // SESSION PERSISTENCE: Check for existing reservation
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
                        <div className="mb-16">
                            <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tighter mb-4">Active & Past Orders</h2>
                            <p className="text-gray-500 text-sm max-w-sm">Track your current rescues and view your contribution history.</p>
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