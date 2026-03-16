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
                // Proactively tell backend to release stock
                fetch(`http://localhost:8000/api/v1/orders/${orderData.orderID}/cancel`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
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
                    userID: user.id || user.email, // Using ID to be consistent with MS
                    itemName: box.name,
                    quantity: quantity
                })
            });

            if (!orderResponse.ok) {
                const errData = await orderResponse.json();
                throw new Error(errData.error || "Reservation failed. Stock might be gone.");
            }

            const data = await orderResponse.json();
            console.log("RESERVATION SUCCESS:", data);
            const expiresAt = Date.now() + (data.expires_in || 60) * 1000;

            // Save to persistence
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
            // Simplified Orchestration call
            const confirmResponse = await fetch(`http://localhost:8000/api/v1/checkout/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    sessionID: orderData.sessionID,
                    amount: total
                })
            });

            if (confirmResponse.ok) {
                const finalData = await confirmResponse.json();
                // SUCCESS: Clear persistence
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md border border-black animate-in fade-in zoom-in duration-300 shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-display uppercase tracking-tight">Checkout</h2>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Step {isReserved ? '2/2: Payment' : '1/2: Reservation'}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-black">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Reservation Status */}
                    {isReserved ? (
                        <div className="bg-green-50 border border-green-200 p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Stock Secured for</span>
                            </div>
                            <span className="text-xl font-display text-green-600 leading-none">
                                {Math.floor(reservationTimer / 60)}:{String(reservationTimer % 60).padStart(2, '0')}
                            </span>
                        </div>
                    ) : (
                        isProcessing && (
                            <div className="bg-blue-50 border border-blue-200 p-4 flex items-center space-x-3">
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                                    Securing your reservation...
                                </span>
                            </div>
                        )
                    )}

                    {/* Order Summary */}
                    <div className="bg-gray-50 p-4 border border-gray-100 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{box.name} x {quantity}</span>
                            <span>${(box.price * quantity).toFixed(2)}</span>
                        </div>
                        {deliveryType === 'delivery' && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Delivery Fee</span>
                                <span>$5.00</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Form Section */}
                    {isReserved ? (
                        <form onSubmit={handlePayment} className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Card Information</label>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="CARDHOLDER NAME"
                                        required
                                        className="w-full border border-gray-200 p-4 text-sm focus:border-black outline-none transition-colors rounded-none placeholder:text-gray-300"
                                        value={cardName}
                                        onChange={(e) => setCardName(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="CARD NUMBER"
                                        required
                                        className="w-full border border-gray-200 p-4 text-sm focus:border-black outline-none transition-colors rounded-none placeholder:text-gray-300"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="MM/YY"
                                            required
                                            className="w-full border border-gray-200 p-4 text-sm focus:border-black outline-none transition-colors rounded-none placeholder:text-gray-300"
                                            value={cardExpiry}
                                            onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                                        />
                                        <input
                                            type="text"
                                            placeholder="CVC"
                                            required
                                            className="w-full border border-gray-200 p-4 text-sm focus:border-black outline-none transition-colors rounded-none placeholder:text-gray-300"
                                            value={cardCVC}
                                            onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && <div className="p-3 bg-red-50 text-red-600 text-xs border border-red-100">{error}</div>}

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isProcessing}
                                className="w-full bg-black text-white hover:bg-gray-800 py-4 uppercase tracking-widest font-bold rounded-none flex items-center justify-center space-x-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <span>Complete Purchase (${total.toFixed(2)})</span>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-6 border border-dashed border-gray-200 text-center grayscale opacity-40 select-none">
                                <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Payment Form Locked</p>
                                <p className="text-[10px] mt-1 italic">Confirming stock availability first...</p>
                            </div>

                            {error && <div className="p-3 bg-red-50 text-red-600 text-xs border border-red-100">{error}</div>}

                            <Button
                                onClick={handleInitialReservation}
                                disabled={isProcessing}
                                className="w-full bg-black text-white hover:bg-gray-800 py-4 uppercase tracking-widest font-bold rounded-none flex items-center justify-center space-x-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Reserving...</span>
                                    </>
                                ) : (
                                    <span>Initiate Checkout</span>
                                )}
                            </Button>
                        </div>
                    )}

                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
                        Secured by Stripe Simulation
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;
