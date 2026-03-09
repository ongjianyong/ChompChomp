import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';

const OrderStatusPage = ({ orderId, user, onLogout, onGoHome, onGoProfile }) => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(30);
    const [showNoCourierModal, setShowNoCourierModal] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/v1/orders/${orderId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrder(data);

                    // If order is dispatched or cancelled, stop loading
                    if (['dispatched', 'ready_for_pickup', 'cancelled'].includes(data.status)) {
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch order status:", error);
            }
        };

        const interval = setInterval(fetchOrder, 3000); // Poll every 3 seconds
        fetchOrder();

        return () => clearInterval(interval);
    }, [orderId]);

    useEffect(() => {
        if (order?.status === 'searching' && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (order?.status === 'searching' && countdown === 0) {
            // This is handled by the backend (Logistics MS), 
            // but we'll show the modal if the status doesn't change from 'searching'
            // after the countdown ends (or if it changes to a failure status)
        }
    }, [order?.status, countdown]);

    // Show 'No Courier' modal if countdown hits 0 and status is still searching or failed
    useEffect(() => {
        if (countdown === 0 && order?.status === 'searching') {
            // For the demo, we wait a few more seconds for the backend event to propagate
            const timeout = setTimeout(() => {
                if (order?.status === 'searching' || order?.status === 'failed') {
                    setShowNoCourierModal(true);
                }
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [countdown, order?.status]);

    if (!order) return <div className="min-h-screen flex items-center justify-center grayscale text-sm uppercase tracking-widest">Initialising Tracker...</div>;

    const steps = [
        { key: 'reserved', label: 'Box Reserved', done: true },
        { key: 'paid', label: 'Payment Confirmed', done: ['paid', 'searching', 'dispatched', 'ready_for_pickup'].includes(order.status) },
        {
            key: 'logistics',
            label: order.delivery_type === 'delivery' ? 'Finding Courier' : 'Preparing order',
            done: ['searching', 'dispatched', 'ready_for_pickup'].includes(order.status)
        },
        { key: 'final', label: order.delivery_type === 'delivery' ? 'Dispatched' : 'Ready for Pickup', done: ['dispatched', 'ready_for_pickup'].includes(order.status) }
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar user={user} onLogout={onLogout} onGoHome={onGoHome} onGoProfile={onGoProfile} />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="border border-black p-8 md:p-12 space-y-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Order Tracking</p>
                            <h1 className="text-4xl font-display uppercase tracking-tight">#{String(orderId).slice(-8)}</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="bg-gray-100 px-3 py-2 text-xs font-bold uppercase tracking-widest border border-gray-200">
                                {order.quantity || 1} Units
                            </div>
                            <div className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest">
                                Status: {order.status}
                            </div>
                        </div>
                    </div>

                    {/* Progress Visual */}
                    <div className="relative pt-8">
                        <div className="absolute top-8 left-0 w-full h-px bg-gray-100"></div>
                        <div className="relative flex justify-between items-center">
                            {steps.map((step, i) => (
                                <div key={step.key} className="flex flex-col items-center group">
                                    <div className={`w-3 h-3 rounded-full border-2 transition-all duration-500 z-10 ${step.done ? 'bg-black border-black' : 'bg-white border-gray-200'}`}></div>
                                    <span className={`mt-4 text-[10px] font-bold uppercase tracking-widest text-center ${step.done ? 'text-black' : 'text-gray-300'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Content */}
                    <div className="bg-gray-50 p-8 border border-gray-100">
                        {(order.status === 'searching' || (order.status === 'paid' && order.delivery_type === 'delivery')) && (
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-gray-200" />
                                        <circle
                                            cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="2" fill="transparent"
                                            strokeDasharray={2 * Math.PI * 44}
                                            strokeDashoffset={2 * Math.PI * 44 * (1 - countdown / 30)}
                                            className="text-black transition-all duration-1000"
                                        />
                                    </svg>
                                    <span className="text-2xl font-display">{countdown}s</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium mb-1">Dispatching Nearest Courier</h3>
                                    <p className="text-sm text-gray-500 max-w-xs">We're matching your purchase with an available courier in the area. This usually takes less than a minute.</p>
                                </div>
                            </div>
                        )}

                        {order.status === 'paid' && order.delivery_type === 'pickup' && (
                            <div className="text-center space-y-6">
                                <div className="text-4xl animate-bounce">🍳</div>
                                <div>
                                    <h3 className="text-lg font-medium mb-1">Merchant is preparing your order</h3>
                                    <p className="text-sm text-gray-500">Your payment is confirmed. We'll notify you when it's ready for collection.</p>
                                </div>
                                <div className="p-4 bg-white border border-gray-200 rounded-lg inline-block">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Pick up address</p>
                                    <p className="text-sm">Restaurant Location (Check details in Home)</p>
                                </div>
                            </div>
                        )}

                        {order.status === 'dispatched' && (
                            <div className="text-center space-y-4">
                                <div className="text-4xl mb-4">🏠</div>
                                <h3 className="text-xl font-medium">Coming your way</h3>
                                <p className="text-sm text-gray-500">A courier has been assigned and is heading to the merchant.</p>
                                <Button variant="secondary" onClick={onGoHome} className="mt-8">Return to Storefront</Button>
                            </div>
                        )}

                        {order.status === 'ready_for_pickup' && (
                            <div className="text-center space-y-4">
                                <div className="text-4xl mb-4">🛍️</div>
                                <h3 className="text-xl font-medium">Ready for Pickup</h3>
                                <p className="text-sm text-gray-500">Please head to the merchant address with your order ID.</p>
                                <div className="p-4 bg-white border border-dashed border-gray-300 font-mono text-sm inline-block uppercase">
                                    CODE: PICKUP-{String(orderId).slice(-4)}
                                </div>
                                <Button variant="secondary" onClick={onGoHome} className="mt-8 block mx-auto">Done</Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* No Courier Modal */}
            {showNoCourierModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white max-w-md w-full border border-black p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-display uppercase leading-none">Dispatcher Timeout</h2>
                            <p className="text-sm text-gray-500">We couldn't secure a courier within the flash sale window.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 border border-gray-100 flex items-center space-x-4">
                                <span className="text-xl">🏃‍♂️</span>
                                <div>
                                    <p className="text-sm font-bold">Switch to Self-Pickup</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">We'll refund your $5 delivery fee instantly.</p>
                                </div>
                                <button
                                    className="ml-auto bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2"
                                    onClick={async () => {
                                        try {
                                            const response = await fetch(`http://localhost:8000/api/v1/orders/${orderId}/switch-pickup`, {
                                                method: 'POST',
                                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                            });
                                            if (response.ok) {
                                                setShowNoCourierModal(false);
                                                setCountdown(0);
                                            }
                                        } catch (err) {
                                            console.error("Failed to switch to pickup:", err);
                                        }
                                    }}
                                >Select</button>
                            </div>

                            <div className="p-4 bg-red-50 border border-red-100 flex items-center space-x-4">
                                <span className="text-xl">❌</span>
                                <div>
                                    <p className="text-sm font-bold text-red-600">Cancel Order</p>
                                    <p className="text-[10px] text-red-400 uppercase tracking-widest">Get a full refund for this purchase.</p>
                                </div>
                                <button
                                    className="ml-auto bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2"
                                    onClick={async () => {
                                        try {
                                            const response = await fetch(`http://localhost:8000/api/v1/orders/${orderId}/cancel`, {
                                                method: 'POST',
                                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                            });
                                            if (response.ok) {
                                                setShowNoCourierModal(false);
                                                onGoHome();
                                            }
                                        } catch (err) {
                                            console.error("Failed to cancel order:", err);
                                        }
                                    }}
                                >Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderStatusPage;
