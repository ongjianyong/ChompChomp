import React, { useState } from 'react';

const LoginModal = ({ onLogin, onRegister, onClose }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('user');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const reset = (newMode) => {
        setMode(newMode);
        setError('');
        setEmail('');
        setPassword('');
        setName('');
        setPhone('');
        setRole('user');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        let result;
        if (mode === 'login') {
            result = await onLogin(email, password);
        } else {
            result = await onRegister(name, email, password, phone, role);
        }
        setLoading(false);
        if (result) setError(result);
    };

    // Demo quick-fill
    const fillUser = () => { setEmail('alice@user.com'); setPassword('password123'); };
    const fillMerchant = () => { setEmail('merchant@chomp.com'); setPassword('password123'); };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-md p-10 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors text-2xl leading-none"
                    aria-label="Close"
                >
                    ×
                </button>

                <h2 className="text-3xl font-display font-medium mb-8">
                    {mode === 'login' ? 'Sign in' : 'Create account'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {mode === 'signup' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 focus:border-black outline-none px-4 py-3 text-sm transition-colors"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 focus:border-black outline-none px-4 py-3 text-sm transition-colors"
                                    placeholder="+65 9123 4567"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full border border-gray-300 focus:border-black outline-none px-4 py-3 text-sm transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full border border-gray-300 focus:border-black outline-none px-4 py-3 text-sm transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    {mode === 'signup' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">I am a</label>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setRole('user')}
                                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest border transition-colors ${role === 'user'
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-black'
                                        }`}
                                >
                                    Customer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('merchant')}
                                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest border transition-colors ${role === 'merchant'
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-black'
                                        }`}
                                >
                                    Merchant
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="text-red-600 text-sm border border-red-200 bg-red-50 px-4 py-2">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-3 font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {/* Toggle login / signup */}
                <p className="mt-6 text-sm text-gray-500 text-center">
                    {mode === 'login' ? (
                        <>Don&apos;t have an account?{' '}
                            <button onClick={() => reset('signup')} className="text-black font-semibold hover:underline">
                                Sign up
                            </button>
                        </>
                    ) : (
                        <>Already have an account?{' '}
                            <button onClick={() => reset('login')} className="text-black font-semibold hover:underline">
                                Sign in
                            </button>
                        </>
                    )}
                </p>

                {/* Demo quick-fill (login only) */}
                {mode === 'login' && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Demo accounts</p>
                        <div className="flex space-x-2">
                            <button
                                onClick={fillUser}
                                className="flex-1 text-xs border border-gray-200 px-3 py-2 hover:border-black transition-colors"
                            >
                                Fill as User
                            </button>
                            <button
                                onClick={fillMerchant}
                                className="flex-1 text-xs border border-gray-200 px-3 py-2 hover:border-black transition-colors"
                            >
                                Fill as Merchant
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginModal;
