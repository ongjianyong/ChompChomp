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
            <div className="bg-white w-full max-w-md border border-slate-900 animate-in fade-in zoom-in duration-300 shadow-xl overflow-hidden rounded-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-900">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-display tracking-tight text-white">Upgrade to Premium</h2>
                        <span className="text-[10px] text-slate-400 tracking-widest font-bold">LIFETIME ACCESS</span>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-slate-50 border border-slate-100 p-5 space-y-3 rounded-xl">
                        <h3 className="text-[10px] font-bold tracking-widest text-slate-400">PREMIUM BENEFITS</h3>
                        <ul className="text-sm text-slate-700 space-y-2.5">
                            <li className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
                                Instant SMS Notifications
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
                                Priority Access to Flash Sales
                            </li>
                        </ul>
                    </div>

                    <div className="bg-slate-900 p-5 flex justify-between font-bold text-xs tracking-widest text-white rounded-xl shadow-lg shadow-slate-200">
                        <span>ONE-TIME PAYMENT</span>
                        <span>$5.00</span>
                    </div>

                    <form onSubmit={handlePayment} className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-xs font-bold tracking-widest text-slate-400">Card Information</label>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Cardholder Name"
                                    required
                                    className="w-full border border-slate-100 bg-slate-50 p-4 text-sm focus:border-slate-900 focus:bg-white outline-none transition-all rounded-xl placeholder:text-slate-300"
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Card Number"
                                    required
                                    className="w-full border border-slate-100 bg-slate-50 p-4 text-sm focus:border-slate-900 focus:bg-white outline-none transition-all rounded-xl placeholder:text-slate-300"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="MM / YY"
                                        required
                                        className="w-full border border-slate-100 bg-slate-50 p-4 text-sm focus:border-slate-900 focus:bg-white outline-none transition-all rounded-xl placeholder:text-slate-300"
                                        value={cardExpiry}
                                        onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                                    />
                                    <input
                                        type="text"
                                        placeholder="CVC"
                                        required
                                        className="w-full border border-slate-100 bg-slate-50 p-4 text-sm focus:border-slate-900 focus:bg-white outline-none transition-all rounded-xl placeholder:text-slate-300"
                                        value={cardCVC}
                                        onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && <div className="p-3 bg-red-50 text-red-600 text-xs border border-red-100 rounded-xl">{error}</div>}

                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isProcessing}
                            className="w-full bg-slate-900 border-transparent text-white hover:bg-black py-4 tracking-widest font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-slate-200"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <span>Pay $5.00</span>
                            )}
                        </Button>
                    </form>
                    <p className="text-[10px] text-gray-400 text-center tracking-widest">
                        Secured by Stripe Simulation
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PremiumUpgradeModal;
