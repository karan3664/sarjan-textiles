"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  status: string;
  subtotal: number;
  createdAt: string;
  paymentMode: string;
  creditDays: number;
};

export function ProfilePageClient() {
  const [client, setClient] = useState<{ id: string; email: string; companyName: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("sarjan-client") ?? "null");
    setClient(stored);
    if (!stored?.id) return;

    fetch(`/api/orders?clientId=${encodeURIComponent(stored.id)}`)
      .then((res) => res.json())
      .then((data) => setOrders(data.orders ?? []))
      .catch(() => setOrders([]));
  }, []);

  return (
    <div className="login-wrap">
      <div className="left">
        <div className="heading"><h4>Order History</h4></div>
        {orders.length ? (
          <table className="sarjan-table">
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.status}</td>
                  <td>₹{order.subtotal.toLocaleString("en-IN")}</td>
                  <td>{order.creditDays} days cheque</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-secondary">No orders yet.</p>
        )}
      </div>
      <div className="right">
        <h4 className="mb_8">B2B Account</h4>
        <p className="text-secondary">{client ? `${client.companyName} (${client.email})` : "Login to see company account and order history."}</p>
      </div>
    </div>
  );
}
