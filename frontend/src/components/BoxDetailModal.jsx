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
                <div className="p-8 space-y-8">
                    <div className="flex space-x-6">
                        <div className="w-1/3 aspect-square bg-gray-100 border border-gray-200 overflow-hidden">
                            <img
                                src={`https://images.unsplash.com/photo-1550617931-e17a7b70dce2?q=80&w=400&h=400`}
                                alt={box.name}
                                className="w-full h-full object-cover grayscale"
                            />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-medium mb-1">{box.name}</h3>
                            <p className="text-gray-500 text-sm mb-2">Merchant #{box.merchantID}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-4">{box.quantity} Units Available</p>
                            <div className="flex items-center space-x-3">
                                <span className="text-gray-400 line-through text-xs">${box.original_price?.toFixed(2)}</span>
                                <span className="text-black font-bold text-xl">${box.price?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Select Quantity</label>
                            <div className="flex items-center border border-black max-w-[200px]">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="px-6 py-3 hover:bg-gray-100 transition-colors border-r border-black"
                                >
                                    -
                                </button>
                                <span className="flex-1 text-center font-bold text-lg">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                                    className="px-6 py-3 hover:bg-gray-100 transition-colors border-l border-black"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex flex-col">
                                <span className="text-gray-500 text-xs uppercase tracking-widest">Order Total</span>
                                <span className="text-[10px] text-gray-400">{quantity}x Box{quantity > 1 ? 'es' : ''} for Store Pickup</span>
                            </div>
                            <span className="text-2xl font-bold">${totalPrice.toFixed(2)}</span>
                        </div>
                        <Button
                            variant="primary"
                            className="w-full bg-black text-white hover:bg-gray-800 py-4 uppercase tracking-widest font-bold rounded-none"
                            onClick={() => onConfirm(box, deliveryType, totalPrice, quantity)}
                        >
                            Confirm Reservation
                        </Button>
                        <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest mt-4">
                            * Stock is reserved for 1 minute after clicking
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoxDetailModal;
