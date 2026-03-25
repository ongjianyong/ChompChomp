import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';

const OrderStatusPage = ({ orderId, user, onLogout, onGoHome, onGoProfile }) => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/v1/orders/${orderId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrder(data);
                }
            } catch (error) {
                console.error("Failed to fetch order status:", error);
            }
        };

        const interval = setInterval(fetchOrder, 5000);
        fetchOrder();

        return () => clearInterval(interval);
    }, [orderId]);

    if (!order) return <div className="min-h-screen flex items-center justify-center grayscale text-sm uppercase tracking-widest">Initialising Pickup Status...</div>;

    const steps = [
        { key: 'reserved', label: 'Box Reserved', done: true },
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
        <div className="min-h-screen bg-white">
            <Navbar user={user} onLogout={onLogout} onGoHome={onGoHome} onGoProfile={onGoProfile} />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="border border-black p-8 md:p-12 space-y-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Order Tracking &bull; {order.merchant_name || 'Self-Pickup'}</p>
                            <h1 className="text-4xl font-display uppercase tracking-tight">#{String(orderId)}</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="bg-gray-100 px-3 py-2 text-xs font-bold uppercase tracking-widest border border-gray-200">
                                {order.quantity || 1} Units
                            </div>
                            <div className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest">
                                {order.status === 'completed' ? 'COMPLETED' : order.status === 'ready_for_pickup' ? 'READY' : 'PREPARING'}
                            </div>
                        </div>
                    </div>

                    {/* Progress Visual */}
                    <div className="relative pt-8">
                        <div className="absolute top-8 left-0 w-full h-px bg-gray-100"></div>
                        <div className="relative flex justify-between items-center px-12">
                            {steps.map((step, i) => (
                                <div key={step.key} className="flex flex-col items-center group">
                                    <div className={`w-4 h-4 rounded-full border-2 transition-all duration-500 z-10 ${step.done ? 'bg-black border-black' : 'bg-white border-gray-200'}`}></div>
                                    <span className={`mt-4 text-[10px] font-bold uppercase tracking-widest text-center ${step.done ? 'text-black' : 'text-gray-300'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Content */}
                    <div className="bg-gray-50 p-12 border border-gray-100">
                        {order.status === 'completed' ? (
                            <div className="text-center space-y-8">
                                <div className="flex justify-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                                        <div className="relative bg-green-100 rounded-full p-4">
                                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-display uppercase tracking-tight">Order Complete</h3>
                                    <p className="text-sm text-gray-500 mt-2">Thank you for rescuing food and reducing waste today!</p>
                                </div>
                                <div className="p-6 bg-white border border-gray-200 mt-6 inline-block">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Receipt Info</div>
                                    <div className="text-sm font-bold text-black uppercase tracking-widest mb-1">Total Paid: ${order.total_paid?.toFixed(2)}</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">Paid via Card</div>
                                </div>
                                <div>
                                    <Button variant="secondary" onClick={onGoHome} className="mt-8 uppercase tracking-widest font-bold">Return to Map</Button>
                                </div>
                            </div>
                        ) : order.status === 'ready_for_pickup' ? (
                            <div className="text-center space-y-8">
                                <div className="text-4xl">🛍️</div>
                                <div>
                                    <h3 className="text-2xl font-display uppercase tracking-tight">Your Order is Ready</h3>
                                    <p className="text-sm text-gray-500 mt-2">Show the code below to the merchant to collect your rescue.</p>
                                </div>
                                <div className="p-6 bg-white border-2 border-dashed border-black font-mono text-xl inline-block uppercase tracking-widest">
                                    CHOMP-{String(orderId).slice(-4)}
                                </div>
                                <div>
                                    <Button variant="secondary" onClick={onGoHome} className="mt-4 uppercase tracking-widest font-bold">Return to Map</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="text-4xl animate-bounce">🍳</div>
                                <div>
                                    <h3 className="text-xl font-medium mb-2">{order.merchant_name || 'Merchant'} is preparing your box</h3>
                                    <p className="text-sm text-gray-500 max-w-sm mx-auto">Your payment is confirmed. Please head to the merchant location. Your box will be ready in minutes.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OrderStatusPage;
