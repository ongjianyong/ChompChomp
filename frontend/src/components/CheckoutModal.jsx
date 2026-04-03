import React, { useState } from 'react';
import Button from './Button';

const CheckoutModal = ({ isOpen, onClose, box, user, deliveryType, total, quantity, onPaymentSuccess }) => {
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCVC, setCardCVC] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [reservationTimer, setReservationTimer] = useState(60);
    const [isReserved, setIsReserved] = useState(false);
    const [orderData, setOrderData] = useState(null);

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

    // Initial timer sync
    React.useEffect(() => {
        if (!isReserved) {
            setReservationTimer(60);
        }
    }, [isReserved, isOpen]);

    // PERSISTENCE: Check for existing reservation on open
    React.useEffect(() => {
        if (isOpen && box && user) {
            const savedRes = localStorage.getItem(`res_${user.email}_${box.itemID}`);
            if (savedRes) {
                const { data, expiresAt } = JSON.parse(savedRes);
                const remaining = Math.floor((expiresAt - Date.now()) / 1000);

                if (remaining > 0) {
                    setOrderData(data);
                    setIsReserved(true);
                    setReservationTimer(remaining);
                } else {
                    localStorage.removeItem(`res_${user.email}_${box.itemID}`);
                }
            }
        }
    }, [isOpen, box, user]);

    React.useEffect(() => {
        if (isReserved && reservationTimer > 0) {
            const timer = setTimeout(() => setReservationTimer(reservationTimer - 1), 1000);
            return () => clearTimeout(timer);
        } else if (isReserved && reservationTimer <= 0) {
            setError("Reservation expired! Please restart checkout.");
            setIsReserved(false);
            if (user && box) {
                localStorage.removeItem(`res_${user.email}_${box.itemID}`);
            }
        }
    }, [isReserved, reservationTimer, user, box, orderData]);

    if (!isOpen || !box) return null;

    const handleInitialReservation = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const orderResponse = await fetch('http://localhost:8000/api/v1/checkout/reserve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    itemID: box.itemID,
                    userID: user.id,
                    merchantID: box.merchantID,
                    merchant_name: box.merchant_name,
                    itemName: box.name,
                    quantity: quantity
                })
            });

            if (!orderResponse.ok) {
                const errData = await orderResponse.json();
                throw new Error(errData.error || "Reservation failed. Stock might be gone.");
            }

            const data = await orderResponse.json();
            const expiresAt = Date.now() + (data.expires_in || 60) * 1000;

            localStorage.setItem(`res_${user.email}_${box.itemID}`, JSON.stringify({ data, expiresAt }));

            setOrderData(data);
            setIsReserved(true);
            setReservationTimer(data.expires_in || 60);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        setError(null);

        try {
            const confirmResponse = await fetch(`http://localhost:8000/api/v1/checkout/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sessionID: orderData.sessionID,
                    amount: total,
                    token: "tok_visa"
                })
            });

            if (confirmResponse.ok) {
                const finalData = await confirmResponse.json();
                localStorage.removeItem(`res_${user.email}_${box.itemID}`);
                onPaymentSuccess(finalData.orderID);
            } else {
                const errData = await confirmResponse.json();
                throw new Error(errData.error || "Payment failed or reservation expired.");
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-display font-semibold text-slate-900">Checkout</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Step {isReserved ? '2/2 — Payment' : '1/2 — Reservation'}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Reservation Status */}
                    {isReserved ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                <span className="text-xs font-semibold text-orange-600">Stock secured for</span>
                            </div>
                            <span className="text-xl font-bold text-orange-600 font-display">
                                {Math.floor(reservationTimer / 60)}:{String(reservationTimer % 60).padStart(2, '0')}
                            </span>
                        </div>
                    ) : (
                        isProcessing && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                <span className="text-xs font-semibold text-blue-700">Securing your reservation...</span>
                            </div>
                        )
                    )}

                    {/* Order Summary */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                                <img 
                                    src={getCategoryImage(box.name)} 
                                    alt={box.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{formatName(box.name)}</p>
                                <p className="text-xs text-slate-400">{quantity} unit{quantity > 1 ? 's' : ''} · Store Pickup</p>
                            </div>
                            <div className="text-sm font-bold text-slate-900 text-right">
                                ${(box.price * quantity).toFixed(2)}
                            </div>
                        </div>
                        <div className="flex justify-between font-bold pt-3 border-t border-slate-200 text-slate-900">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Form Section */}
                    {isReserved ? (
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-slate-400">Card Information</p>
                                <input
                                    type="text"
                                    placeholder="Cardholder name"
                                    required
                                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Card number"
                                    required
                                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="MM/YY"
                                        required
                                        className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                                        value={cardExpiry}
                                        onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                                    />
                                    <input
                                        type="text"
                                        placeholder="CVC"
                                        required
                                        className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                                        value={cardCVC}
                                        onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                    />
                                </div>
                            </div>

                            {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">{error}</div>}

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isProcessing}
                                className="w-full py-4 text-sm font-semibold rounded-xl"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                        Processing...
                                    </>
                                ) : (
                                    `Complete Purchase ($${total.toFixed(2)})`
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-5 border border-dashed border-slate-200 rounded-xl text-center opacity-50 select-none">
                                <p className="text-xs font-semibold text-slate-500">Payment Form Locked</p>
                                <p className="text-xs text-slate-400 mt-1">Confirming stock availability first...</p>
                            </div>

                            {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">{error}</div>}

                            <Button
                                onClick={handleInitialReservation}
                                disabled={isProcessing}
                                variant="primary"
                                className="w-full py-4 text-sm font-semibold rounded-xl"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                        Reserving...
                                    </>
                                ) : (
                                    'Initiate Checkout'
                                )}
                            </Button>
                        </div>
                    )}

                    <p className="text-xs text-slate-400 text-center">Secured by Stripe Simulation</p>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;
