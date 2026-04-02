import React, { useState } from 'react';
import PremiumUpgradeModal from './PremiumUpgradeModal';

const Navbar = ({ currentView, user, onOpenLogin, onLogout, onGoHome, onGoProfile, onUserUpdate }) => {
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const effectiveView = currentView === 'profile' ? user?.role : currentView;

    return (
        <>
        <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">

                    {/* Logo — navigate home without logging out */}
                    <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={onGoHome}>
                        <span className="font-display font-medium text-2xl tracking-tight text-black">ChompChomp</span>
                    </div>

                    {/* Auth Controls */}
                    <div className="hidden md:flex space-x-6 items-center">
                        {effectiveView === 'common' && (
                            <button
                                onClick={onOpenLogin}
                                className="font-bold text-xs text-white bg-black px-6 py-2.5 hover:bg-gray-800 transition-colors uppercase tracking-[0.2em]"
                            >
                                LOGIN
                            </button>
                        )}

                        {effectiveView === 'user' && user && (
                            <div className="flex items-center space-x-6">
                                <span className="font-medium text-sm text-black flex items-center space-x-2">
                                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                                    <button
                                        onClick={onGoProfile}
                                        className="hover:underline cursor-pointer"
                                        title="EDIT PROFILE"
                                    >
                                        {user.name.toUpperCase()}
                                    </button>
                                </span>
                                {user.tier === 'premium' ? (
                                    <span 
                                        className="font-bold text-[10px] px-3 py-1.5 uppercase tracking-widest border border-amber-400 text-amber-600 bg-amber-50 cursor-default"
                                        title="YOU ARE A PREMIUM MEMBER"
                                    >
                                        PREMIUM
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => setIsUpgradeModalOpen(true)}
                                        className="font-bold text-[10px] px-3 py-1.5 uppercase tracking-widest border border-gray-300 text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-400 transition-colors focus:outline-none"
                                        title="UPGRADE TO PREMIUM"
                                    >
                                        GET PREMIUM
                                    </button>
                                )}
                                <button onClick={onLogout} className="font-bold text-[10px] text-gray-400 hover:text-black transition-colors uppercase tracking-widest">LOGOUT</button>
                            </div>
                        )}

                        {effectiveView === 'merchant' && user && (
                            <div className="flex items-center space-x-6">
                                <button
                                    onClick={onGoProfile}
                                    className="font-medium text-sm text-black border-b-2 border-transparent hover:border-black cursor-pointer pb-1 uppercase tracking-widest transition-colors"
                                    title="EDIT PROFILE"
                                >
                                    {user.name.toUpperCase()}
                                </button>
                                <button onClick={onLogout} className="font-bold text-[10px] text-white bg-black hover:bg-gray-800 transition-colors px-6 py-2.5 uppercase tracking-[0.2em]">LOGOUT</button>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </nav>
            {effectiveView === 'user' && user && (
                <PremiumUpgradeModal 
                    isOpen={isUpgradeModalOpen} 
                    onClose={() => setIsUpgradeModalOpen(false)} 
                    user={user} 
                    onUpgradeSuccess={() => {
                        const updatedUser = { ...user, tier: 'premium' };
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                        if (onUserUpdate) onUserUpdate(updatedUser);
                        setIsUpgradeModalOpen(false);
                    }} 
                />
            )}
        </>
    );
};

export default Navbar;
