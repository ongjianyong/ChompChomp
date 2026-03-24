import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import Card from '../components/Card';

const MerchantDashboard = ({ currentView, user, onLogout, onGoHome, onGoProfile }) => {
    const [isListing, setIsListing] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItemId, setEditingItemId] = useState(null);
    const [itemToRemove, setItemToRemove] = useState(null);
    const [showRemoveModal, setShowRemoveModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        quantity: '',
        original_price: '',
        price: '',
        description: 'Premium surplus box'
    });

    useEffect(() => {
        const fetchMerchantItems = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/v1/inventory/merchant/${user.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setItems(data);
                }
            } catch (error) {
                console.error("Failed to fetch merchant listings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user && user.id) {
            fetchMerchantItems();
        }
    }, [user]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmitListing = async (e) => {
        e.preventDefault();
        try {
            const url = editingItemId
                ? `http://localhost:8000/api/v1/inventory/${editingItemId}`
                : 'http://localhost:8000/api/v1/discovery/listings';
            const method = editingItemId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    merchantID: user.id,
                    merchant_name: user.name,
                    postal_code: user.postal_code, // Include for geocoding
                    ...formData,
                    quantity: parseInt(formData.quantity),
                    price: parseFloat(formData.price),
                    original_price: parseFloat(formData.original_price)
                })
            });

            if (response.ok) {
                setIsListing(false);
                setFormData({ name: '', quantity: '', original_price: '', price: '', description: 'Premium surplus box' });
                // Note: You would typically refetch or update state here.
                // For this example, we'll reload to show the item.
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to save listing:", error);
        }
    };

    const handleEditListing = (item) => {
        setEditingItemId(item.itemID);
        setFormData({
            name: item.name,
            quantity: item.quantity,
            original_price: item.original_price,
            price: item.price,
            description: item.description || ''
        });
        setIsListing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmRemoveListing = (item) => {
        setItemToRemove(item);
        setShowRemoveModal(true);
    };

    const executeRemoveListing = async () => {
        if (!itemToRemove) return;

        try {
            const response = await fetch(`http://localhost:8000/api/v1/inventory/${itemToRemove.itemID}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                setItems(items.filter(item => item.itemID !== itemToRemove.itemID));
                setShowRemoveModal(false);
                setItemToRemove(null);
            }
        } catch (error) {
            console.error("Failed to remove listing:", error);
        }
    };

    const handleCancelForm = () => {
        setIsListing(false);
        setEditingItemId(null);
        setFormData({ name: '', quantity: '', original_price: '', price: '', description: 'Premium surplus box' });
    };

    return (
        <div className="min-h-screen bg-white">
            <Navbar currentView={currentView} user={user} onLogout={onLogout} onGoHome={onGoHome} onGoProfile={onGoProfile} />

            <main className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-display text-black mb-2 uppercase tracking-tight">Merchant Dashboard</h1>
                        <p className="text-gray-500 font-sans text-sm uppercase tracking-widest opacity-60">Manage your surplus and rescue food waste.</p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => isListing ? handleCancelForm() : setIsListing(true)}
                        className="bg-black text-white hover:bg-gray-800 rounded-none px-8 py-3 uppercase tracking-widest text-xs font-bold transition-all"
                    >
                        {isListing ? 'Cancel' : '+ New Box Listing'}
                    </Button>
                </div>

                {
                    isListing && (
                        <Card className="mb-12 p-10 border border-black bg-white rounded-none shadow-2xl animate-in slide-in-from-top-4 duration-500">
                            <h2 className="text-2xl font-display mb-8 uppercase">{editingItemId ? 'Edit Listing' : 'List a New Box'}</h2>
                            <form className="space-y-8" onSubmit={handleSubmitListing}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Food Box Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full border border-gray-200 p-4 text-sm focus:border-black outline-none transition-colors rounded-none"
                                            placeholder="e.g. End of Day Pastries"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Quantity Available</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full border border-gray-200 p-4 text-sm focus:border-black outline-none transition-colors rounded-none"
                                            placeholder="5"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Original Price ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full border border-gray-200 p-4 text-sm focus:border-black outline-none transition-colors rounded-none"
                                            placeholder="40.00"
                                            value={formData.original_price}
                                            onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Discounted Price ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full border border-gray-200 p-4 text-sm focus:border-black outline-none transition-colors rounded-none"
                                            placeholder="20.00"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t border-gray-100">
                                    <Button variant="primary" type="submit" className="bg-black text-white px-12 py-4 rounded-none uppercase tracking-widest text-sm font-bold">
                                        {editingItemId ? 'Update Listing' : 'List Box Now'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )
                }

                <h2 className="text-2xl font-display mb-8 uppercase tracking-tight">Active Listings</h2>
                <div className="bg-white rounded-none border border-black overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400 uppercase tracking-widest text-sm grayscale opacity-50">Syncing with Inventory...</div>
                    ) : items.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 uppercase tracking-widest text-sm">No active listings. Rescue your first box today.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item details</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Management</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {items.map((item, index) => (
                                    <tr key={item.itemID || index} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-12 w-12 bg-gray-100 border border-gray-200 overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                                                    <img src={`https://images.unsplash.com/photo-1550617931-e17a7b70dce2?q=80&w=100&h=100`} alt="" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-black uppercase tracking-tight">{item.name}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">ID: {item.itemID}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="text-sm font-bold text-black">${item.price?.toFixed(2) || '0.00'}</div>
                                            <div className="text-[10px] text-gray-400 line-through tracking-widest">${item.original_price?.toFixed(2) || '0.00'}</div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="text-sm text-black font-medium">{item.quantity} units</div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-[10px] font-bold border ${item.quantity > 0 ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'} uppercase tracking-widest`}>
                                                {item.quantity > 0 ? 'Live' : 'Sold Out'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-right text-xs font-bold">
                                            <button onClick={() => handleEditListing(item)} className="text-gray-300 hover:text-black transition-colors uppercase tracking-widest mr-4">Edit</button>
                                            <button onClick={() => confirmRemoveListing(item)} className="text-gray-300 hover:text-red-600 transition-colors uppercase tracking-widest">Remove</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Remove Confirmation Modal */}
            {showRemoveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white border border-black shadow-2xl max-w-md w-full p-8 animate-in slide-in-from-bottom-4 duration-300 rounded-none">
                        <div className="mb-6">
                            <h3 className="text-2xl font-display uppercase tracking-tighter text-black mb-2 border-b-2 border-red-600 inline-block pb-1">Remove Listing</h3>
                            <p className="text-gray-500 font-sans text-sm mt-4 leading-relaxed">
                                Are you sure you want to permanently remove "<span className="font-bold text-black">{itemToRemove?.name}</span>"? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-4 justify-end mt-8">
                            <button
                                onClick={() => setShowRemoveModal(false)}
                                className="px-6 py-3 border border-gray-300 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeRemoveListing}
                                className="px-6 py-3 bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-colors cursor-pointer"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchantDashboard;
