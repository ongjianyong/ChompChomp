import React, { useState } from 'react';
import Button from './Button';

const BoxDetailModal = ({ isOpen, onClose, box, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);
    const deliveryType = 'pickup';

    if (!isOpen || !box) return null;

    const maxQty = box.quantity || 1;
    const itemTotal = box.price * quantity;
    const totalPrice = itemTotal;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg border border-black overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-display uppercase tracking-tight">Item Details</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-10">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">MERCHANT SOURCE: {box.merchant_name || `ID ${box.merchantID}`}</div>
                        <h3 className="text-4xl font-display uppercase tracking-tighter mb-6">{box.name}</h3>
                        
                        <div className="grid grid-cols-2 gap-8 py-6 border-y border-gray-100">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">SAVINGS</span>
                                <div className="flex items-baseline space-x-3">
                                    <span className="text-3xl font-bold text-black">${box.price?.toFixed(2)}</span>
                                    <span className="text-sm text-gray-400 line-through">${box.original_price?.toFixed(2)}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">AVAILABILITY</span>
                                <span className={`text-xs font-bold uppercase tracking-widest ${box.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {box.quantity} UNITS REMAINING
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SELECT QUANTITY</label>
                        <div className="flex items-center border border-black w-full max-w-[240px]">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="px-8 py-4 hover:bg-gray-100 transition-colors border-r border-black font-bold"
                            >
                                -
                            </button>
                            <span className="flex-1 text-center font-bold text-xl">{quantity}</span>
                            <button
                                onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                                className="px-8 py-4 hover:bg-gray-100 transition-colors border-l border-black font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <div className="flex justify-between items-end mb-8">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">TRANSACTION TOTAL</span>
                                <span className="text-xs text-black uppercase tracking-tight font-medium">
                                    {quantity} UNIT{quantity > 1 ? 'S' : ''} x STORE PICKUP
                                </span>
                            </div>
                            <span className="text-4xl font-bold tracking-tighter">${totalPrice.toFixed(2)}</span>
                        </div>
                        <Button
                            variant="primary"
                            className="w-full bg-black text-white hover:bg-gray-800 py-5 uppercase tracking-widest font-bold rounded-none text-xs"
                            onClick={() => onConfirm(box, deliveryType, totalPrice, quantity)}
                        >
                            CONFIRM RESERVATION
                        </Button>
                        <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest mt-6 font-medium">
                            NOTICE: STOCK IS HELD FOR 60 SECONDS UPON SELECTION
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoxDetailModal;
