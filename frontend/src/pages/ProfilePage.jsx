import React, { useState } from 'react';

const ProfilePage = ({ user, onUserUpdate, onGoHome }) => {
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [postalCode, setPostalCode] = useState(user?.postal_code || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch(`http://localhost:8000/api/v1/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name, phone, postal_code: postalCode })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                onUserUpdate(updatedUser);
                setMessage({ text: 'Profile updated successfully! Returning home...', type: 'success' });
                setTimeout(() => {
                    if (onGoHome) onGoHome();
                }, 1000);
            } else {
                setMessage({ text: 'Failed to update profile.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Network error. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="pt-24 pb-12 min-h-screen bg-gray-50 flex flex-col items-center">
            <div className="w-full max-w-lg bg-white p-8 border border-gray-200 shadow-sm">
                <div className="mb-8 border-b border-gray-100 pb-4">
                    <h2 className="text-3xl font-display uppercase tracking-tighter">Your Profile</h2>
                    <p className="text-gray-500 mt-2 text-sm">Update your contact details to ensure you receive SMS notifications for new flash sales.</p>
                </div>

                {message.text && (
                    <div className={`mb-6 p-4 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">
                            Email address
                        </label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            placeholder="+6591234567"
                            className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        />
                        <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +65). Required for SMS alerts.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">
                            Postal Code
                        </label>
                        <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            placeholder="123456"
                            className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        />
                        <p className="mt-1 text-xs text-gray-500">Singapore 6-digit postal code. Used for calculating distance to shops.</p>
                    </div>

                    {user.role !== 'merchant' && (
                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">Current Tier</span>
                                <span className={`font-bold text-xs px-3 py-1 uppercase tracking-widest border ${user.tier === 'premium'
                                    ? 'bg-amber-50 border-amber-400 text-amber-600'
                                    : 'bg-gray-50 border-gray-300 text-gray-500'
                                    }`}>
                                    {user.tier}
                                </span>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white px-6 py-4 text-sm font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
