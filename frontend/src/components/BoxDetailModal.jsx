import React, { useState } from 'react';
import Button from './Button';

const BoxDetailModal = ({ isOpen, onClose, box, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);
    const deliveryType = 'pickup';

    if (!isOpen || !box) return null;

    const maxQty = box.quantity || 1;
    const itemTotal = box.price * quantity;
    const totalPrice = itemTotal;

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Hero Image */}
                <div className="h-64 relative overflow-hidden">
                    <img 
                        src={getCategoryImage(box.name)} 
                        alt={box.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="absolute bottom-6 left-6">
                        <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">{box.merchant_name}</p>
                        <h2 className="text-3xl font-display font-semibold text-white leading-tight">{formatName(box.name)}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4">
                                <span className="text-xs font-semibold text-slate-400 block mb-1">Savings</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-slate-900">${box.price?.toFixed(2)}</span>
                                    <span className="text-sm text-slate-400 line-through">${box.original_price?.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4">
                                <span className="text-xs font-semibold text-slate-400 block mb-1">Availability</span>
                                <span className={`text-sm font-bold ${box.quantity > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                                    {box.quantity} units left
                                </span>
                            </div>
                    </div>
                </div>

                <div className="p-8 pt-0 space-y-8">
                    <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-3">Quantity</label>
                        <div className="flex items-center bg-slate-50 rounded-xl w-fit border border-slate-200">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-l-xl transition-colors font-bold text-slate-600"
                            >
                                −
                            </button>
                            <span className="w-12 text-center font-bold text-slate-900">{quantity}</span>
                            <button
                                onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                                className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-r-xl transition-colors font-bold text-slate-600"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-semibold text-slate-500">{quantity} unit{quantity > 1 ? 's' : ''} · Store pickup</p>
                            <p className="text-xs text-slate-400 mt-0.5">Stock held for 60 seconds upon selection</p>
                        </div>
                        <span className="text-3xl font-bold text-slate-900">${totalPrice.toFixed(2)}</span>
                    </div>

                    <Button
                        variant="primary"
                        className="w-full py-4 text-sm font-semibold rounded-xl"
                        onClick={() => onConfirm(box, deliveryType, totalPrice, quantity)}
                    >
                        Confirm Reservation
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default BoxDetailModal;
