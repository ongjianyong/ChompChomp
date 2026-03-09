import React, { useState, useEffect } from 'react';
import Button from './Button';

const MyOrdersList = ({ user, onViewOrder }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/v1/orders/user/${encodeURIComponent(user.email)}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrders(data);
                }
            } catch (error) {
                console.error("Failed to fetch orders:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [user.email]);

    if (loading) return <div className="text-center py-20 grayscale opacity-50 uppercase tracking-widest text-sm">Fetching your orders...</div>;

    if (orders.length === 0) {
        return (
            <div className="border border-dashed border-gray-200 py-32 text-center text-gray-400 uppercase tracking-widest text-sm px-4">
                You haven't rescued any boxes yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {orders.map((order) => (
                <div key={order.orderID} className="border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-black transition-colors">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Order</span>
                            <span className="text-xl font-display uppercase tracking-tight leading-none">#{String(order.orderID).slice(-8)}</span>
                        </div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">
                            {order.quantity || 1} {order.quantity > 1 ? 'Units' : 'Unit'} &bull; ${order.total_paid?.toFixed(2)}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${['cancelled', 'failed'].includes(order.status) ? 'border-red-200 text-red-500 bg-red-50' :
                            ['dispatched', 'ready_for_pickup'].includes(order.status) ? 'border-black text-white bg-black' :
                                'border-gray-200 text-gray-500 bg-gray-50'
                            }`}>
                            Status: {order.status}
                        </div>

                        {!['cancelled', 'failed'].includes(order.status) && (
                            <Button
                                variant="secondary"
                                className="text-[10px] px-6 py-2 uppercase tracking-widest font-bold"
                                onClick={() => onViewOrder(order.orderID)}
                            >
                                Track Order
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MyOrdersList;
