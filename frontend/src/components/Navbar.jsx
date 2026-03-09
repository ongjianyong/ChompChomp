import React from 'react';

const Navbar = ({ currentView, user, onOpenLogin, onLogout, onGoHome, onGoProfile }) => {
    return (
        <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">

                    {/* Logo — navigate home without logging out */}
                    <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={onGoHome}>
                        <span className="font-display font-medium text-2xl tracking-tight text-black">ChompChomp</span>
                    </div>

                    {/* Auth Controls */}
                    <div className="hidden md:flex space-x-6 items-center">
                        {currentView === 'common' && (
                            <button
                                onClick={onOpenLogin}
                                className="font-medium text-sm text-white bg-black px-5 py-2 hover:bg-gray-800 transition-colors uppercase tracking-wider"
                            >
                                Login
                            </button>
                        )}

                        {currentView === 'user' && user && (
                            <div className="flex items-center space-x-6">
                                <span className="font-medium text-sm text-black flex items-center space-x-2">
                                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                                    <button
                                        onClick={onGoProfile}
                                        className="hover:underline cursor-pointer"
                                        title="Edit Profile"
                                    >
                                        {user.name}
                                    </button>
                                </span>
                                <button
                                    onClick={async () => {
                                        const newTier = user.tier === 'premium' ? 'regular' : 'premium';
                                        try {
                                            const response = await fetch(`http://localhost:8000/api/v1/users/${user.id}/tier`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ tier: newTier })
                                            });
                                            if (response.ok) {
                                                const updatedUser = await response.json();
                                                // Assuming App.jsx passes down a way to update the global user state,
                                                // or we force a reload if not available. We'll use window.location.reload() 
                                                // as a fallback if a precise state updater isn't passed, but the best approach 
                                                // is to trigger a re-render from App.
                                                const currentUserStr = localStorage.getItem('user');
                                                if (currentUserStr) {
                                                    const currentUser = JSON.parse(currentUserStr);
                                                    currentUser.tier = newTier;
                                                    localStorage.setItem('user', JSON.stringify(currentUser));
                                                    window.location.reload(); // Quick explicit refresh to sync state across all components
                                                }
                                            }
                                        } catch (e) {
                                            console.error("Failed to update tier", e);
                                        }
                                    }}
                                    className={`font-bold text-xs px-2 py-1 uppercase tracking-widest border transition-colors cursor-pointer hover:bg-gray-50 focus:outline-none ${user.tier === 'premium'
                                        ? 'border-amber-400 text-amber-600 hover:bg-amber-50'
                                        : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                                        }`}
                                    title="Click to toggle subscription tier"
                                >
                                    {user.tier}
                                </button>
                                <button onClick={onLogout} className="font-medium text-sm text-gray-500 hover:text-black transition-colors">Logout</button>
                                <button className="text-black hover:text-gray-600 relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-black text-[10px] font-bold text-white">0</span>
                                </button>
                            </div>
                        )}

                        {currentView === 'merchant' && user && (
                            <div className="flex items-center space-x-6">
                                <button
                                    onClick={onGoProfile}
                                    className="font-medium text-sm text-black border-b-2 border-transparent hover:border-black cursor-pointer pb-1 uppercase tracking-widest transition-colors"
                                    title="Edit Profile"
                                >
                                    {user.name}
                                </button>
                                <button onClick={onLogout} className="font-medium text-sm text-white bg-black hover:bg-gray-800 transition-colors px-4 py-2 uppercase tracking-wider">Logout</button>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </nav>
    );
};

export default Navbar;
