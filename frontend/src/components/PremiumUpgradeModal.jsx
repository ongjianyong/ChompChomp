import React, { useState } from 'react';
import Button from './Button';

const PremiumUpgradeModal = ({ isOpen, onClose, user, onUpgradeSuccess }) => {
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCVC, setCardCVC] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !user) return null;

    const handlePayment = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        setError(null);

        try {
            // 1. Process $5 Payment via Payment MS
            const paymentResponse = await fetch(`http://localhost:8000/api/v1/payments/charge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    orderID: `upgrade_${user.id}`,
                    amount: 5.00,
                    token: "tok_visa" // Simulated token
                })
            });

            if (!paymentResponse.ok) {
                const errData = await paymentResponse.json();
                throw new Error(errData.error || "Payment failed. Please try again.");
            }

            // 2. Upgrade User Tier via User MS
            const upgradeResponse = await fetch(`http://localhost:8000/api/v1/users/${user.id}/tier`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ tier: 'premium' })
            });

            if (!upgradeResponse.ok) {
                const errData = await upgradeResponse.json();
                throw new Error(errData.error || "Payment succeeded, but tier upgrade failed.");
            }

            // Success callback
            onUpgradeSuccess();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md border border-amber-400 animate-in fade-in zoom-in duration-300 shadow-premium">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-display uppercase tracking-tight text-amber-600">UPGRADE TO PREMIUM</h2>
                        <span className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">ONE-TIME PAYMENT</span>
                    </div>
                    <button onClick={onClose} className="text-amber-400 hover:text-amber-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-amber-50 border border-amber-200 p-4 space-y-2">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-700">PREMIUM BENEFITS</h3>
                        <ul className="text-sm text-amber-700 space-y-2">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                INSTANT SMS NOTIFICATIONS FOR NEW LISTINGS
                            </li>
                            <li className="flex items-center gap-2 uppercase text-[10px] font-medium tracking-tight">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                PRIORITY ACCESS TO HIGH-DEMAND BOXES
                            </li>

                        </ul>
                    </div>

                    <div className="bg-gray-50 p-4 border border-gray-100 flex justify-between font-bold text-[10px] uppercase tracking-widest">
                        <span>LIFETIME ACCESS</span>
                        <span>$5.00</span>
                    </div>

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
                            className="w-full bg-amber-500 border-transparent text-white hover:bg-amber-600 py-4 uppercase tracking-widest font-bold rounded-none flex items-center justify-center space-x-2"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>PROCESSING...</span>
                                </>
                            ) : (
                                <span>PAY $5.00</span>
                            )}
                        </Button>
                    </form>
                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
                        Secured by Stripe Simulation
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PremiumUpgradeModal;
