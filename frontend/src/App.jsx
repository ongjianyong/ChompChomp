import React, { useState, useEffect } from 'react'
import Home from './pages/Home'
import MerchantDashboard from './pages/MerchantDashboard'
import LoginModal from './components/LoginModal'
import OrderStatusPage from './pages/OrderStatusPage'
import ProfilePage from './pages/ProfilePage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  const [currentView, setCurrentView] = useState('common');
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);

  // Check for existing token on load
  useEffect(() => {
    const path = window.location.pathname;
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (path === '/analytics') {
        setCurrentView('analytics');
      } else if (path === '/profile') {
        setCurrentView('profile');
      } else {
        setCurrentView(parsedUser.role);
      }
    }
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setCurrentView(data.user.role);
        setShowLogin(false);
      } else {
        return 'Invalid email or password.';
      }
    } catch (error) {
      return 'Could not reach server. Is Kong running?';
    }
  };

  const handleRegister = async (name, email, password, phone, role, postal_code) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, role, postal_code })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setCurrentView(data.user.role);
        setShowLogin(false);
      } else {
        return data.error || 'Registration failed.';
      }
    } catch (error) {
      return 'Could not reach server. Is Kong running?';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentView('common');
    window.history.pushState({}, '', '/');
  };

  // Navigate home without logging out
  const handleGoHome = () => {
    if (currentView === 'merchant' || user?.role === 'merchant') {
      setCurrentView('merchant');
      window.history.pushState({}, '', '/');
    } else {
      setCurrentView(user?.role || 'common');
      window.history.pushState({}, '', '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleViewOrderStatus = (orderId) => {
    setActiveOrderId(orderId);
    setCurrentView('order_status');
    window.history.pushState({}, '', `/orders/${orderId}`);
  };

  const sharedProps = {
    currentView,
    user,
    onOpenLogin: () => setShowLogin(true),
    onLogout: handleLogout,
    onGoHome: handleGoHome,
    onViewOrderStatus: handleViewOrderStatus,
    onGoProfile: () => {
      setCurrentView('profile');
      window.history.pushState({}, '', '/profile');
    },
    onGoAnalytics: () => {
      setCurrentView('analytics');
      window.history.pushState({}, '', '/analytics');
    },
    onUserUpdate: (updatedUser) => {
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <div className="App">
      {showLogin && (
        <LoginModal
          onLogin={handleLogin}
          onRegister={handleRegister}
          onClose={() => setShowLogin(false)}
        />
      )}

      {(currentView === 'common' || currentView === 'user') && (
        <Home {...sharedProps} />
      )}
      {currentView === 'profile' && user && (
        <ProfilePage user={user} onUserUpdate={sharedProps.onUserUpdate} onGoHome={sharedProps.onGoHome} />
      )}
      {currentView === 'analytics' && user && (
        <AnalyticsPage {...sharedProps} />
      )}
      {currentView === 'merchant' && (
        <MerchantDashboard {...sharedProps} />
      )}
      {currentView === 'order_status' && (
        <OrderStatusPage {...sharedProps} orderId={activeOrderId} />
      )}
    </div>
  )
}

export default App
