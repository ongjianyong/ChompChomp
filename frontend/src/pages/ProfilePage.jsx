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
        <div className="pt-24 pb-12 min-h-screen flex flex-col items-center" style={{ background: 'linear-gradient(180deg, #f9fafb 0%, #f1f5f9 100%)' }}>
            <div className="w-full max-w-lg">
                <button
                    onClick={onGoHome}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors mb-6"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
            </div>
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl border border-slate-100" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                <div className="mb-8 border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-display font-semibold text-slate-900">Your Profile</h2>
                    <p className="text-slate-400 mt-1.5 text-sm">Update your contact details to ensure you receive SMS notifications for new flash sales.</p>
                </div>

                {message.text && (
                    <div className={`mb-6 p-4 text-sm font-medium rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            Email address
                        </label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            placeholder="+6591234567"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +65). Required for SMS alerts.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            Postal Code
                        </label>
                        <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            placeholder="123456"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">Singapore 6-digit postal code. Used for calculating distance to shops.</p>
                    </div>

                    {user.role !== 'merchant' && (
                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-xs font-semibold text-slate-400">Current Tier</span>
                                <span className={`font-semibold text-xs px-3 py-1.5 rounded-full ${user.tier === 'premium'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {user.tier}
                                </span>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white px-6 py-4 text-sm font-semibold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ boxShadow: '0 8px 20px rgba(22,163,74,0.25)' }}
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
