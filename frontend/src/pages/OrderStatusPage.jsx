import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';

const OrderStatusPage = ({ orderId, user, onLogout, onGoHome, onGoProfile }) => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error("No authorization token found. Please log in again.");
                return;
            }
            try {
                const response = await fetch(`http://localhost:8000/api/v1/orders/${orderId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrder(data);
                } else if (response.status === 401) {
                    console.error("401 Unauthorized: Your session may have expired. Please log in again.");
                } else {
                    console.error(`Failed to fetch order status. Status: ${response.status}`);
                }
            } catch (error) {
                console.error("Network error while fetching order status:", error);
            }
        };

        const interval = setInterval(fetchOrder, 5000);
        fetchOrder();

        return () => clearInterval(interval);
    }, [orderId]);

    if (!order) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Loading order status...</span>
            </div>
        </div>
    );

    const steps = [
        { key: 'reserved', label: 'Reserved', done: true },
        { key: 'paid', label: 'Payment Confirmed', done: true },
        {
            key: 'ready',
            label: 'Ready for Pickup',
            done: order.status === 'ready_for_pickup' || order.status === 'completed'
        },
        {
            key: 'completed',
            label: 'Collected',
            done: order.status === 'completed'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar user={user} onLogout={onLogout} onGoHome={onGoHome} onGoProfile={onGoProfile} />

            <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-10 space-y-10">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 mb-1">
                                Order Tracking · {order.merchant_name?.toUpperCase() || 'SELF-PICKUP'}
                            </p>
                            <h1 className="text-3xl font-display font-semibold text-slate-900">#{String(orderId)}</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 rounded-lg">
                                {order.quantity || 1} Units
                            </span>
                            <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                                order.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : order.status === 'ready_for_pickup'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-amber-100 text-amber-700'
                            }`}>
                                {order.status === 'completed' ? 'Completed' : order.status === 'ready_for_pickup' ? 'Ready' : 'Preparing'}
                            </span>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="relative">
                        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100"></div>
                        <div className="relative flex justify-between">
                            {steps.map((step) => (
                                <div key={step.key} className="flex flex-col items-center gap-3 z-10">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                        step.done
                                            ? 'bg-green-600 border-green-600'
                                            : 'bg-white border-slate-200'
                                    }`}>
                                        {step.done && (
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className={`text-xs font-semibold text-center max-w-[70px] ${step.done ? 'text-slate-700' : 'text-slate-300'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Content */}
                    <div className="bg-slate-50 rounded-xl p-8">
                        {order.status === 'completed' ? (
                            <div className="text-center space-y-6">
                                <div className="flex justify-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-60"></div>
                                        <div className="relative bg-green-100 rounded-full p-4">
                                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-display font-semibold text-slate-900">Order Complete</h3>
                                    <p className="text-sm text-slate-500 mt-2">Thank you for rescuing food and reducing waste today!</p>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-100 p-5 inline-block">
                                    <p className="text-xs font-semibold text-slate-400 mb-1">Receipt</p>
                                    <p className="text-sm font-semibold text-slate-700">
                                        {order.quantity || 1} {order.quantity > 1 ? 'units' : 'unit'} · Total: ${order.total_paid?.toFixed(2)}
                                    </p>
                                    <Button variant="secondary" onClick={onGoHome} className="mt-4 text-sm font-semibold rounded-xl">
                                        Return to Map
                                    </Button>
                                </div>
                            </div>
                        ) : order.status === 'ready_for_pickup' ? (
                            <div className="text-center space-y-6">
                                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full">Collection Ready</span>
                                <div>
                                    <h3 className="text-2xl font-display font-semibold text-slate-900">Your order is ready</h3>
                                    <p className="text-sm text-slate-500 mt-2">Show the code below to the merchant to collect your rescue.</p>
                                </div>
                                <div className="bg-white border-2 border-dashed border-green-400 rounded-xl px-8 py-5 inline-block font-mono text-xl font-bold text-slate-900 tracking-widest">
                                    CHOMP-{String(orderId).slice(-4)}
                                </div>
                                <div>
                                    <Button variant="secondary" onClick={onGoHome} className="text-sm font-semibold rounded-xl">
                                        Return to Map
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-4">
                                <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold px-4 py-2 rounded-full border border-amber-200 animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    Preparing rescue
                                </span>
                                <div>
                                    <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">
                                        {order.merchant_name || 'Merchant'} is preparing your box
                                    </h3>
                                    <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                        Your payment is confirmed. Please head to the merchant location. Your box will be ready in minutes.
                                    </p>
                                </div>
                                <Button variant="secondary" onClick={onGoHome} className="text-sm font-semibold rounded-xl">
                                    Back to Home
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OrderStatusPage;
