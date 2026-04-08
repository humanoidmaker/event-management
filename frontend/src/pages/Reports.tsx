import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { BarChart3, Loader2, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const COLORS = ['#4c1d95', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4'];

export default function Reports() {
  const [events, setEvents] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [evRes, regRes, budRes] = await Promise.allSettled([
        api.get('/events'),
        api.get('/registrations'),
        api.get('/budget'),
      ]);
      setEvents(evRes.status === 'fulfilled' ? (evRes.value.data.data || evRes.value.data || []) : []);
      setRegistrations(regRes.status === 'fulfilled' ? (regRes.value.data.data || regRes.value.data || []) : []);
      setBudgets(budRes.status === 'fulfilled' ? (budRes.value.data.data || budRes.value.data || []) : []);
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
      </div>
    );
  }

  // Revenue by Event
  const revenueByEvent = events.map((e) => ({
    name: (e.title || e.name || '').substring(0, 20),
    revenue: e.revenue || e.total_revenue || 0,
  })).filter((e) => e.revenue > 0).slice(0, 10);

  // Ticket type distribution
  const ticketTypes: Record<string, number> = {};
  registrations.forEach((r) => {
    const type = r.ticket_name || r.ticket_type || 'General';
    ticketTypes[type] = (ticketTypes[type] || 0) + 1;
  });
  const ticketPie = Object.entries(ticketTypes).map(([name, value]) => ({ name, value }));

  // Registration timeline
  const timelineMap: Record<string, number> = {};
  registrations.forEach((r) => {
    const date = new Date(r.created_at || r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
    timelineMap[date] = (timelineMap[date] || 0) + 1;
  });
  const timelineData = Object.entries(timelineMap).map(([date, count]) => ({ date, count })).slice(-30);

  // Budget vs Actual
  const budgetComparison = events.map((e) => {
    const eventBudgets = budgets.filter((b: any) => b.event_id === (e._id || e.id));
    const estimated = eventBudgets.reduce((s: number, b: any) => s + (b.estimated_amount || 0), 0);
    const actual = eventBudgets.reduce((s: number, b: any) => s + (b.actual_amount || 0), 0);
    return { name: (e.title || e.name || '').substring(0, 15), estimated, actual };
  }).filter((e) => e.estimated > 0 || e.actual > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[#f59e0b]" /> Reports & Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Event */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Event</h3>
          {revenueByEvent.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByEvent} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#4c1d95" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No revenue data</div>
          )}
        </div>

        {/* Ticket Type Distribution */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Type Distribution</h3>
          {ticketPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={ticketPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}
                  dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {ticketPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No registration data</div>
          )}
        </div>

        {/* Registration Timeline */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Timeline</h3>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No timeline data</div>
          )}
        </div>

        {/* Budget vs Actual */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual</h3>
          {budgetComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="estimated" fill="#4c1d95" name="Estimated" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#f59e0b" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No budget data</div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-[#4c1d95]">{events.length}</p>
          <p className="text-sm text-gray-500">Total Events</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-[#f59e0b]">{registrations.length}</p>
          <p className="text-sm text-gray-500">Total Registrations</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(events.reduce((s, e) => s + (e.revenue || e.total_revenue || 0), 0))}
          </p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {registrations.filter((r) => r.status === 'checked_in' || r.checked_in).length}
          </p>
          <p className="text-sm text-gray-500">Total Check-ins</p>
        </div>
      </div>
    </div>
  );
}
