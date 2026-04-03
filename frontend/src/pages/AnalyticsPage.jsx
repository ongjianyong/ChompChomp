import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeItem = (item) => ({
  itemID: item.itemID ?? item.ItemID,
  price: toNumber(item.price ?? item.Price),
  original_price: toNumber(item.original_price ?? item.OriginalPrice),
});

const money = (value) => `$${toNumber(value).toFixed(2)}`;

const StatCard = ({ label, value, hint }) => (
  <div
    className="bg-white rounded-2xl border border-slate-100 p-6"
    style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
  >
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
    <p className="mt-3 text-3xl font-display font-semibold text-slate-900">{value}</p>
    {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
  </div>
);

const AnalyticsPage = ({ user, currentView, onLogout, onGoHome, onGoProfile }) => {
  const [orders, setOrders] = useState([]);
  const [inventoryById, setInventoryById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user?.id || !user?.role) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const ordersUrl = user.role === 'merchant'
          ? `http://localhost:8000/api/v1/orders/merchant/${user.id}`
          : `http://localhost:8000/api/v1/orders/user/${user.id}`;

        const [ordersResp, inventoryResp] = await Promise.all([
          fetch(ordersUrl, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          fetch('http://localhost:8000/api/v1/inventory').catch(() => null),
        ]);

        if (!ordersResp.ok) {
          throw new Error('Failed to load analytics orders.');
        }

        const fetchedOrders = await ordersResp.json();
        setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);

        if (inventoryResp && inventoryResp.ok) {
          const inventoryItems = await inventoryResp.json();
          const mapped = {};
          (Array.isArray(inventoryItems) ? inventoryItems : [])
            .map(normalizeItem)
            .forEach((item) => {
              if (item.itemID !== undefined && item.itemID !== null) {
                mapped[String(item.itemID)] = item;
              }
            });
          setInventoryById(mapped);
        } else {
          setInventoryById({});
        }
      } catch (e) {
        setError(e.message || 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [user]);

  const stats = useMemo(() => {
    const totalMoney = orders.reduce((sum, order) => sum + toNumber(order.total_paid), 0);
    const totalItemsPurchased = orders.reduce((sum, order) => sum + toNumber(order.quantity, 1), 0);

    const savingsAccumulator = orders.reduce((acc, order) => {
      const quantity = toNumber(order.quantity, 1);
      const item = inventoryById[String(order.itemID)];

      if (!item) {
        return acc;
      }

      const original = toNumber(item.original_price);
      const discounted = toNumber(item.price);
      const perUnitSaved = Math.max(0, original - discounted);

      return {
        knownSavings: acc.knownSavings + perUnitSaved * quantity,
        matchedOrders: acc.matchedOrders + 1,
      };
    }, { knownSavings: 0, matchedOrders: 0 });

    if (user?.role === 'merchant') {
      return {
        merchantMoneySaved: totalMoney,
        merchantItemsPurchased: totalItemsPurchased,
      };
    }

    return {
      customerTotalSpent: totalMoney,
      customerTotalSaved: savingsAccumulator.knownSavings,
      customerMerchantHelpedSave: totalMoney,
      customerItemsPurchased: totalItemsPurchased,
      savingsCoverage: {
        matchedOrders: savingsAccumulator.matchedOrders,
        totalOrders: orders.length,
      },
    };
  }, [orders, inventoryById, user]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        currentView={currentView}
        user={user}
        onLogout={onLogout}
        onGoHome={onGoHome}
        onGoProfile={onGoProfile}
      />

      <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Insights</p>
          <h1 className="mt-2 text-4xl font-display font-semibold text-slate-900">
            {user?.role === 'merchant' ? 'Merchant Analytics' : 'Customer Analytics'}
          </h1>
          <p className="mt-2 text-slate-500 text-sm">
            {user?.role === 'merchant'
              ? 'Track the impact and performance of your rescued-food listings.'
              : 'Track your spending and the impact of each rescued order.'}
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-slate-500 text-sm">
            Loading analytics...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-5 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && user?.role === 'merchant' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              label="Money Saved"
              value={money(stats.merchantMoneySaved)}
              hint="Revenue recovered through rescued-food purchases."
            />
            <StatCard
              label="Food Items Purchased"
              value={String(stats.merchantItemsPurchased)}
              hint="Total quantity of units bought from your listings."
            />
          </div>
        )}

        {!loading && !error && user?.role !== 'merchant' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard
              label="Total Money Spent"
              value={money(stats.customerTotalSpent)}
              hint="Amount you paid across all orders."
            />
            <StatCard
              label="Total Money Saved"
              value={money(stats.customerTotalSaved)}
              hint="Computed from original price minus discounted price when available."
            />
            <StatCard
              label="Helped Merchant Save"
              value={money(stats.customerMerchantHelpedSave)}
              hint="Value of food rescued through your purchases."
            />
            <StatCard
              label="Food Items Purchased"
              value={String(stats.customerItemsPurchased)}
              hint="Total quantity of units you purchased."
            />
          </div>
        )}

        {!loading && !error && user?.role !== 'merchant' && (
          <p className="mt-5 text-xs text-slate-400">
            Savings coverage: {stats.savingsCoverage?.matchedOrders ?? 0} of {stats.savingsCoverage?.totalOrders ?? 0} orders have matched listing price data.
          </p>
        )}
      </main>
    </div>
  );
};

export default AnalyticsPage;