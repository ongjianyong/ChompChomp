import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import BoxDetailModal from '../components/BoxDetailModal';
import CheckoutModal from '../components/CheckoutModal';
import MyOrdersList from '../components/MyOrdersList';

const Home = ({ currentView, user, onOpenLogin, onLogout, onGoHome, onViewOrderStatus, onGoProfile, onUserUpdate }) => {
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
    const [selectedMerchantId, setSelectedMerchantId] = useState(null);

    const readShopIdFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        const value = params.get('shopId');
        return value ? String(value) : null;
    };

    const writeShopIdToUrl = (shopId) => {
        const url = new URL(window.location.href);
        if (shopId) {
            url.searchParams.set('shopId', String(shopId));
        } else {
            url.searchParams.delete('shopId');
        }
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
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
                    console.error('Failed to fetch listings via GraphQL:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchItems();
        }
    }, [activeTab, user?.lat, user?.long, user?.tier, maxDist]);

    useEffect(() => {
        if (activeTab !== 'browse') {
            setSelectedMerchantId(null);
        }
    }, [activeTab]);

    useEffect(() => {
        const initialShopId = readShopIdFromUrl();
        if (initialShopId) setSelectedMerchantId(initialShopId);
    }, []);

    const isGuest = !user;

    const merchants = useMemo(() => {
        const grouped = new Map();

        items.forEach((item) => {
            const merchantID = String(item.merchantID || item.merchant_name || 'unknown');
            if (!grouped.has(merchantID)) {
                grouped.set(merchantID, {
                    merchantID,
                    merchant_name: item.merchant_name || `Merchant ${merchantID}`,
                    products: [],
                    liveCount: 0,
                    totalQuantity: 0,
                    minPrice: null,
                    nearestDistance: null
                });
            }

            const merchant = grouped.get(merchantID);
            merchant.products.push(item);
            merchant.totalQuantity += Number(item.quantity || 0);
            if ((item.quantity || 0) > 0) merchant.liveCount += 1;

            const price = Number(item.price);
            if (!Number.isNaN(price)) {
                merchant.minPrice = merchant.minPrice === null ? price : Math.min(merchant.minPrice, price);
            }

            const distance = Number(item.distance);
            if (!Number.isNaN(distance)) {
                merchant.nearestDistance = merchant.nearestDistance === null ? distance : Math.min(merchant.nearestDistance, distance);
            }
        });

        return Array.from(grouped.values()).sort((a, b) => {
            if (b.liveCount !== a.liveCount) return b.liveCount - a.liveCount;
            return a.merchant_name.localeCompare(b.merchant_name);
        });
    }, [items]);

    const selectedMerchant = useMemo(
        () => merchants.find((merchant) => merchant.merchantID === selectedMerchantId) || null,
        [merchants, selectedMerchantId]
    );

    useEffect(() => {
        if (selectedMerchantId && !selectedMerchant) {
            setSelectedMerchantId(null);
        }
    }, [selectedMerchantId, selectedMerchant]);

    useEffect(() => {
        if (activeTab !== 'browse') {
            writeShopIdToUrl(null);
            return;
        }
        writeShopIdToUrl(selectedMerchantId);
    }, [activeTab, selectedMerchantId]);

    const handleBuy = (product, e) => {
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
                }
                localStorage.removeItem(`res_${user.email}_${product.itemID}`);
            } catch (err) {
                console.error('Invalid saved reservation:', err);
                localStorage.removeItem(`res_${user.email}_${product.itemID}`);
            }
        }

        setSelectedBox(product);
        setIsDetailModalOpen(true);
    };

    const handleListingsClick = () => {
        setActiveTab('browse');
        setSelectedMerchantId(null);
    };

    const handleNavbarGoHome = () => {
        setActiveTab('browse');
        setSelectedMerchantId(null);
        onGoHome();
    };

    return (
        <div className="min-h-screen bg-white">
            <Navbar currentView={currentView} user={user} onOpenLogin={onOpenLogin} onLogout={onLogout} onGoHome={handleNavbarGoHome} onGoProfile={onGoProfile} onUserUpdate={onUserUpdate} />

            {isGuest && (
                <section className="pt-24 pb-16 lg:pt-36 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
                    <h1 className="text-5xl md:text-7xl font-display font-medium tracking-tight text-black mb-6 uppercase">
                        Rescue great food.<br />
                        Pay less. Waste nothing.
                    </h1>
                    <p className="text-gray-500 text-lg max-w-xl mb-10 font-sans font-light uppercase tracking-widest text-xs">
                        Premium surplus from top restaurants - claimed before it goes to waste.
                    </p>
                    <div className="flex justify-center">
                        <Button onClick={onOpenLogin} variant="primary" className="bg-black text-white hover:bg-gray-800 px-12 py-5 text-xl rounded-none uppercase tracking-widest font-bold">
                            Shop Now
                        </Button>
                    </div>
                </section>
            )}

            <main className={`${isGuest ? 'py-24' : 'pt-32 pb-24'} px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto`}>
                {!isGuest && (
                    <div className="flex space-x-12 mb-12 border-b border-gray-100">
                        <button
                            onClick={handleListingsClick}
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

                            {!isGuest && user?.role === 'user' && (
                                <div className={`ml-4 px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                                    user?.tier === 'premium'
                                        ? 'bg-amber-50 border-amber-400 text-amber-600'
                                        : 'bg-gray-50 border-gray-300 text-gray-500'
                                }`}>
                                    {user?.tier === 'premium' ? 'Premium - Early Access' : 'Free - Delayed Access'}
                                </div>
                            )}

                            {!isGuest && user?.lat && (
                                <div className="flex-grow flex-shrink-0 flex justify-end items-center space-x-3">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">WITHIN</span>
                                    <select
                                        value={maxDist || ''}
                                        onChange={(e) => setMaxDist(e.target.value ? Number(e.target.value) : null)}
                                        className="bg-transparent border-b border-black text-xs font-bold uppercase tracking-widest py-1 outline-none"
                                    >
                                        <option value="">ANY DISTANCE</option>
                                        <option value="2">2KM</option>
                                        <option value="5">5KM</option>
                                        <option value="10">10KM</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="text-center py-20 grayscale opacity-50 uppercase tracking-widest text-sm">Loading current listings...</div>
                        ) : merchants.length === 0 ? (
                            <div className="border border-gray-100 py-32 text-center text-gray-400 uppercase tracking-widest text-sm px-4">
                                {user?.tier !== 'premium'
                                    ? 'No listings available yet. Premium members get early access - upgrade to see listings first.'
                                    : 'No active listings right now. Check back soon.'}
                            </div>
                        ) : !selectedMerchant ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {merchants.map((merchant) => (
                                    <div
                                        key={merchant.merchantID}
                                        className="group cursor-pointer flex flex-col h-full border border-black hover:bg-gray-50 transition-all duration-300"
                                        onClick={() => setSelectedMerchantId(merchant.merchantID)}
                                    >
                                        <div className="p-8 border-b border-black bg-white">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">SELLER</div>
                                            <h3 className="text-2xl font-display uppercase tracking-tight text-black line-clamp-2 leading-none">{merchant.merchant_name}</h3>
                                        </div>
                                        <div className="p-8 flex flex-col flex-grow bg-white">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">ACTIVE LISTINGS</div>
                                                    <div className="text-2xl font-bold text-black">{merchant.liveCount}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">TOTAL STOCK</div>
                                                    <div className="text-2xl font-bold text-black">{merchant.totalQuantity}</div>
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-6 border-t border-gray-100 flex items-end justify-between">
                                                <div>
                                                    {merchant.minPrice !== null && (
                                                        <>
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">STARTS FROM</div>
                                                            <div className="text-xl font-bold text-black">${merchant.minPrice.toFixed(2)}</div>
                                                        </>
                                                    )}
                                                    {merchant.nearestDistance !== null && (
                                                        <div className="mt-3 text-[10px] font-bold text-black uppercase tracking-[0.2em]">
                                                            NEAREST: {merchant.nearestDistance}KM
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="primary"
                                                    className="bg-black text-white hover:bg-gray-800 rounded-none px-6 py-3 uppercase tracking-widest text-[10px] font-bold"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMerchantId(merchant.merchantID);
                                                    }}
                                                >
                                                    View Products
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="mb-8 flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Selected Seller</div>
                                        <h3 className="text-3xl md:text-4xl font-display uppercase tracking-tight">{selectedMerchant.merchant_name}</h3>
                                        <p className="mt-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                            {selectedMerchant.products.length} listing{selectedMerchant.products.length === 1 ? '' : 's'} available
                                        </p>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        className="rounded-none px-6 py-3 uppercase tracking-widest text-[10px] font-bold"
                                        onClick={() => setSelectedMerchantId(null)}
                                    >
                                        Back to Shops
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {selectedMerchant.products.map((product) => (
                                        <div key={product.itemID} className="group cursor-pointer flex flex-col h-full border border-black hover:bg-gray-50 transition-all duration-300">
                                            <div className="p-8 border-b border-black bg-white flex flex-col justify-between h-40">
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">{product.merchant_name}</div>
                                                    <h3 className="text-2xl font-display uppercase tracking-tight text-black line-clamp-2 leading-none">{product.name}</h3>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest inline-block border px-2 py-0.5 ${product.quantity > 0 ? 'border-black text-black' : 'border-red-600 text-red-600'}`}>
                                                        {product.quantity > 0 ? 'STATUS: LIVE' : 'STATUS: SOLD OUT'}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                        QTY: {product.quantity} AVAILABLE
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-8 flex flex-col flex-grow bg-white">
                                                <div className="flex items-end justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">PRICE DROP</span>
                                                        <div className="flex items-baseline space-x-2">
                                                            <span className="text-2xl font-bold text-black leading-none">${product.price?.toFixed(2) || '0.00'}</span>
                                                            <span className="text-gray-400 line-through text-xs font-medium tracking-tighter">${product.original_price?.toFixed(2) || '0.00'}</span>
                                                        </div>
                                                        {product.distance !== undefined && product.distance !== null && (
                                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                                <span className="text-[10px] font-bold text-black uppercase tracking-[0.2em]">
                                                                    DISTANCE: {product.distance}KM
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="primary"
                                                        className="bg-black text-white hover:bg-gray-800 rounded-none px-8 py-3 uppercase tracking-widest text-[10px] font-bold"
                                                        onClick={(e) => handleBuy(product, e)}
                                                    >
                                                        Buy
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <div className="mb-16">
                            <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tighter mb-4">Active & Past Orders</h2>
                            <p className="text-gray-500 text-sm max-w-sm uppercase tracking-widest text-[10px] font-bold">Track your current rescues and view your contribution history.</p>
                        </div>
                        <MyOrdersList user={user} onViewOrder={onViewOrderStatus} />
                    </>
                )}
            </main>

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
