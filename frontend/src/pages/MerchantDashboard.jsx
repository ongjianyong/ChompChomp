import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Button from "../components/Button";

const MerchantDashboard = ({
  currentView,
  user,
  onLogout,
  onGoHome,
  onGoProfile,
}) => {
  const [isListing, setIsListing] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [formError, setFormError] = useState("");

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [activeOrderTab, setActiveOrderTab] = useState("incoming");

  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    original_price: "",
    price: "",
    description: "Premium surplus box",
    category: "bakery",
  });

    const CATEGORIES = [
        { id: 'bakery', name: 'Bakery', icon: '🥖' },
        { id: 'meals', name: 'Meals', icon: '🍱' },
        { id: 'drinks', name: 'Drinks', icon: '🥤' },
        { id: 'desserts', name: 'Desserts', icon: '🍩' },
        { id: 'healthy', name: 'Healthy', icon: '🥗' },
        { id: 'proteins', name: 'Proteins', icon: '🥩' },
        { id: 'others', name: 'Others', icon: '📦' }
    ];

  useEffect(() => {
    const fetchMerchantItems = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/v1/inventory/merchant/${user.id}`,
        );
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

    const fetchMerchantOrders = async () => {
      try {
        let nameMap = {};
        try {
          const invResp = await fetch(`http://localhost:8000/api/v1/inventory`);
          if (invResp.ok) {
            const allItems = await invResp.json();
            allItems.forEach((item) => {
              const id = item.itemID || item.ItemID;
              const name = item.name || item.Name;
              if (id && name) nameMap[id] = name;
            });
          }
        } catch {}

        const response = await fetch(
          `http://localhost:8000/api/v1/orders/merchant/${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          setOrders(
            data.map((o) => ({
              ...o,
              itemName: nameMap[o.itemID] ?? `Item #${o.itemID}`,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch merchant orders:", error);
      } finally {
        setOrdersLoading(false);
      }
    };

    if (user && user.id) {
      fetchMerchantItems();
      fetchMerchantOrders();
    }
  }, [user]);

  // Split orders into incoming vs completed
  const incomingOrders = orders.filter((o) => o.status !== "completed");
  const completedOrders = orders.filter((o) => o.status === "completed");

  const handleInputChange = (e) => {
    setFormError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitListing = async (e) => {
    e.preventDefault();
    setFormError("");

    const price = parseFloat(formData.price);
    const originalPrice = parseFloat(formData.original_price);

    if (
      Number.isFinite(price) &&
      Number.isFinite(originalPrice) &&
      price === originalPrice
    ) {
      setFormError(
        "Discounted price must be different from the original price.",
      );
      return;
    }

    try {
      const url = editingItemId
        ? `http://localhost:8000/api/v1/inventory/${editingItemId}`
        : "http://localhost:8000/api/v1/discovery/listings";
      const method = editingItemId ? "PUT" : "POST";

            // Extract category and clean up name
            const categoryTag = `[${formData.category.toUpperCase()}]`;
            let cleanName = formData.name;
            // Remove existing tag if present during edit
            cleanName = cleanName.replace(/^\[[A-Z]+\]\s*/, '');
            const finalName = `${categoryTag} ${cleanName}`;

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          merchantID: user.id,
          merchant_name: user.name,
          postal_code: user.postal_code,
          ...formData,
                    name: finalName,
          quantity: parseInt(formData.quantity),
          price,
          original_price: originalPrice,
        }),
      });

      if (response.ok) {
        setIsListing(false);
        setFormError("");
        setFormData({
          name: "",
          quantity: "",
          original_price: "",
          price: "",
          description: "Premium surplus box",
        });
        window.location.reload();
      } else {
        const data = await response.json().catch(() => ({}));
        setFormError(data.error || data.message || "Failed to save listing.");
      }
    } catch (error) {
      console.error("Failed to save listing:", error);
      setFormError("Failed to save listing.");
    }
  };

  const handleEditListing = (item) => {
    setEditingItemId(item.itemID);
        
        // Parse category from name
        const displayName = item.name || '';
        const match = displayName.match(/^\[([A-Z]+)\]/);
        const category = match ? match[1].toLowerCase() : 'others';
        const cleanName = displayName.replace(/^\[[A-Z]+\]\s*/, '');

    setFormData({
      name: cleanName,
      quantity: item.quantity,
      original_price: item.original_price,
      price: item.price,
      description: item.description || "",
      category: category,
    });
    setFormError("");
    setIsListing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmRemoveListing = (item) => {
    setItemToRemove(item);
    setShowRemoveModal(true);
  };

  const executeRemoveListing = async () => {
    if (!itemToRemove) return;
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/inventory/${itemToRemove.itemID}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (response.ok) {
        setItems(items.filter((item) => item.itemID !== itemToRemove.itemID));
        setShowRemoveModal(false);
        setItemToRemove(null);
      }
    } catch (error) {
      console.error("Failed to remove listing:", error);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (response.ok) {
        setOrders(
          orders.map((o) =>
            o.orderID === orderId ? { ...o, status: newStatus } : o,
          ),
        );
        // If the order just became completed, switch to the completed tab
        if (newStatus === "completed") {
          setActiveOrderTab("completed");
        }
      }
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  };

  const handleCancelForm = () => {
    setIsListing(false);
    setEditingItemId(null);
    setFormError("");
    setFormData({
      name: "",
      quantity: "",
      original_price: "",
      price: "",
      description: "Premium surplus box",
      category: "bakery",
    });
  };

  const inputClass =
    "w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all";
  const labelClass = "text-xs font-semibold text-slate-400 block mb-1.5";

  const OrderRow = ({ order, idx }) => (
    <div
      key={order.orderID || idx}
      className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up hover:shadow-md transition-all duration-200"
      style={{
        animationDelay: `${idx * 0.05}s`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex items-center gap-5">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-slate-500">
            #{order.orderID}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {order.itemName} · {order.quantity} unit
            {order.quantity > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-slate-400">
            Customer #{order.customerID} · ${order.total_paid?.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {order.status === "paid" && (
          <Button
            onClick={() =>
              handleUpdateOrderStatus(order.orderID, "ready_for_pickup")
            }
            variant="secondary"
            className="rounded-xl py-2 px-4 text-xs font-semibold"
          >
            Mark Ready
          </Button>
        )}
        {order.status === "ready_for_pickup" && (
          <Button
            onClick={() => handleUpdateOrderStatus(order.orderID, "completed")}
            variant="primary"
            className="rounded-xl py-2 px-4 text-xs font-semibold"
          >
            Process Pickup
          </Button>
        )}
        {order.status === "completed" && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 text-green-600">
            ✓ Completed
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #f9fafb 0%, #f1f5f9 100%)",
      }}
    >
      <Navbar
        currentView={currentView}
        user={user}
        onLogout={onLogout}
        onGoHome={onGoHome}
        onGoProfile={onGoProfile}
      />

      <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-3xl font-display font-semibold text-slate-900 mb-1">
              Merchant Dashboard
            </h1>
            <p className="text-slate-400 text-sm">
              Manage your surplus listings and incoming orders.
            </p>
          </div>
        </div>

        {/* New Listing Form */}
        {isListing && (
          <div
            className="bg-white rounded-2xl border border-slate-100 p-8 mb-10 animate-in slide-in-from-top-4 duration-300"
            style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
          >
            <h2 className="text-lg font-display font-semibold text-slate-900 mb-6">
              {editingItemId ? "Edit Listing" : "Create New Listing"}
            </h2>
            <form className="space-y-6" onSubmit={handleSubmitListing}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Food Box Name</label>
                  <input
                    type="text"
                    required
                    className={inputClass}
                    placeholder="e.g. End of Day Pastries"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                                <div>
                                    <label className={labelClass}>Box Category</label>
                                    <select
                                        required
                                        className={inputClass}
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                <div>
                  <label className={labelClass}>Quantity Available</label>
                  <input
                    type="number"
                    required
                    className={inputClass}
                    placeholder="5"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Original Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className={inputClass}
                    placeholder="40.00"
                    value={formData.original_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        original_price: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Discounted Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className={inputClass}
                    placeholder="20.00"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
              </div>
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="flex justify-end pt-2 gap-8">
                <Button
                  variant={isListing ? "secondary" : "primary"}
                  onClick={() =>
                    isListing ? handleCancelForm() : setIsListing(true)
                  }
                  className="rounded-xl px-6 py-2.5 text-sm font-semibold"
                >
                  {isListing ? "Cancel" : "+ New Listing"}
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="rounded-xl px-8 py-3 text-sm font-semibold"
                >
                  {editingItemId ? "Update Listing" : "List Box Now"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Active Listings */}
        <div className="mb-12">
          <h2 className="text-xl font-display font-semibold text-slate-900 mb-5">
            Active Listings
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                  style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
                >
                  <div className="h-1.5 skeleton"></div>
                  <div className="p-5 space-y-3">
                    <div className="h-3 skeleton rounded-full w-1/3"></div>
                    <div className="h-5 skeleton rounded-full w-2/3"></div>
                    <div className="h-3 skeleton rounded-full w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div
              className="bg-white rounded-2xl border border-slate-100 py-16 text-center"
              style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
            >
              <div className="text-3xl mb-3">📦</div>
              <p className="text-slate-700 font-semibold mb-1">
                No active listings
              </p>
              <p className="text-slate-400 text-sm">
                Create your first box listing to start rescuing food.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {items.map((item, idx) => (
                <div
                  key={item.itemID || idx}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:-translate-y-0.5 transition-all duration-200 animate-fade-up"
                  style={{
                    animationDelay: `${idx * 0.06}s`,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="h-1.5 bg-gradient-to-r from-orange-400 to-amber-500"></div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-slate-400 font-medium mb-0.5">
                          ID: {item.itemID}
                        </p>
                        <h3 className="text-base font-semibold text-slate-900">
                          {item.name}
                        </h3>
                      </div>
                      {item.quantity > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-orange-50 text-orange-700 shrink-0">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                          Live
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-600 shrink-0">
                          Sold Out
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Price</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold text-slate-900">
                            ${item.price?.toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400 line-through">
                            ${item.original_price?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-xs text-slate-400 mb-0.5">Stock</p>
                        <span className="text-lg font-bold text-slate-900">
                          {item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-slate-50">
                      <button
                        onClick={() => handleEditListing(item)}
                        className="flex-1 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg py-2 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => confirmRemoveListing(item)}
                        className="flex-1 text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg py-2 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders Section with Tabs */}
        <div>
          {/* Tab Header */}
          <div className="flex items-center gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveOrderTab("incoming")}
              className={`relative px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeOrderTab === "incoming"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Incoming Orders
              {incomingOrders.length > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                    activeOrderTab === "incoming"
                      ? "bg-orange-500 text-white"
                      : "bg-slate-300 text-slate-600"
                  }`}
                >
                  {incomingOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveOrderTab("completed")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeOrderTab === "completed"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Completed
              {completedOrders.length > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                    activeOrderTab === "completed"
                      ? "bg-green-500 text-white"
                      : "bg-slate-300 text-slate-600"
                  }`}
                >
                  {completedOrders.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-100 p-5"
                  style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
                >
                  <div className="flex justify-between">
                    <div className="space-y-2 w-1/3">
                      <div className="h-3 skeleton rounded-full"></div>
                      <div className="h-4 skeleton rounded-full w-2/3"></div>
                    </div>
                    <div className="h-8 w-24 skeleton rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeOrderTab === "incoming" ? (
            incomingOrders.length === 0 ? (
              <div
                className="bg-white rounded-2xl border border-slate-100 py-16 text-center"
                style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
              >
                <div className="text-3xl mb-3">🛒</div>
                <p className="text-slate-700 font-semibold mb-1">
                  No incoming orders
                </p>
                <p className="text-slate-400 text-sm">
                  Orders will appear here once customers purchase your listings.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingOrders.map((order, idx) => (
                  <OrderRow
                    key={order.orderID || idx}
                    order={order}
                    idx={idx}
                  />
                ))}
              </div>
            )
          ) : completedOrders.length === 0 ? (
            <div
              className="bg-white rounded-2xl border border-slate-100 py-16 text-center"
              style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
            >
              <div className="text-3xl mb-3">✅</div>
              <p className="text-slate-700 font-semibold mb-1">
                No completed orders yet
              </p>
              <p className="text-slate-400 text-sm">
                Completed pickups will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedOrders.map((order, idx) => (
                <OrderRow key={order.orderID || idx} order={order} idx={idx} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Remove Confirmation Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">
              Remove Listing
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Are you sure you want to remove "
              <span className="font-semibold text-slate-800">
                {itemToRemove?.name}
              </span>
              "? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRemoveModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeRemoveListing}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
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
