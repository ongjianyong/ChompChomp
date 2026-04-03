import React, { useState } from 'react';
import PremiumUpgradeModal from './PremiumUpgradeModal';

const Navbar = ({ currentView, user, onOpenLogin, onLogout, onGoHome, onGoProfile }) => {
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    return (
        <>
        <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">

                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center cursor-pointer gap-2" onClick={onGoHome}>
                        <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-display font-bold text-sm">C</span>
                        </div>
                        <span className="font-display font-semibold text-xl tracking-tight text-slate-900">
                            Chomp<span className="text-green-600">Chomp</span>
                        </span>
                    </div>

                    {/* Auth Controls */}
                    <div className="hidden md:flex space-x-4 items-center">
                        {currentView === 'common' && (
                            <button
                                onClick={onOpenLogin}
                                className="font-semibold text-sm text-white bg-green-600 px-6 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
                            >
                                Login
                            </button>
                        )}

                        {currentView === 'user' && user && (
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={onGoProfile}
                                    className="flex items-center space-x-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                                    title="Edit Profile"
                                >
                                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                                    <span>{user.name}</span>
                                </button>
                                {user.tier === 'premium' ? (
                                    <span
                                        className="font-semibold text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 cursor-default"
                                        title="You are a Premium Member"
                                    >
                                        Premium
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => setIsUpgradeModalOpen(true)}
                                        className="font-semibold text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                                        title="Upgrade to Premium"
                                    >
                                        Get Premium
                                    </button>
                                )}
                                <button onClick={onLogout} className="font-semibold text-sm text-slate-400 hover:text-slate-700 transition-colors">Logout</button>
                            </div>
                        )}

                        {currentView === 'merchant' && user && (
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={onGoProfile}
                                    className="font-medium text-sm text-slate-700 hover:text-slate-900 transition-colors"
                                    title="Edit Profile"
                                >
                                    {user.name}
                                </button>
                                <button onClick={onLogout} className="font-semibold text-sm text-white bg-green-600 hover:bg-green-700 transition-colors px-5 py-2.5 rounded-xl">Logout</button>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </nav>
            {currentView === 'user' && user && (
                <PremiumUpgradeModal
                    isOpen={isUpgradeModalOpen}
                    onClose={() => setIsUpgradeModalOpen(false)}
                    user={user}
                    onUpgradeSuccess={() => {
                        const currentUserStr = localStorage.getItem('user');
                        if (currentUserStr) {
                            const currentUser = JSON.parse(currentUserStr);
                            currentUser.tier = 'premium';
                            localStorage.setItem('user', JSON.stringify(currentUser));
                            window.location.reload();
                        }
                    }}
                />
            )}
        </>
    );
};

export default Navbar;
