import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Calendar, Users, IndianRupee, CheckCircle, Loader2, MapPin, Clock,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, eventsRes] = await Promise.all([
        api.get('/registrations/stats'),
        api.get('/events'),
      ]);
      const s = statsRes.data.data || statsRes.data;
      setStats(s);

      const evList = eventsRes.data.data || eventsRes.data || [];
      const upcoming = evList
        .filter((e: any) => new Date(e.date) >= new Date())
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 6);
      setEvents(upcoming);

      // Build revenue chart from events
      const revenueMap: Record<string, number> = {};
      evList.forEach((e: any) => {
        const month = new Date(e.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        revenueMap[month] = (revenueMap[month] || 0) + (e.revenue || e.total_revenue || 0);
      });
      setRevenueData(Object.entries(revenueMap).map(([month, revenue]) => ({ month, revenue })));
    } catch (err) {
      setError('Failed to load dashboard data');
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>{error}</p>
        <button onClick={loadDashboard} className="mt-3 text-sm text-[#f59e0b] hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Upcoming Events', value: stats?.upcoming_events ?? events.length, icon: Calendar, color: 'bg-[#4c1d95]' },
    { label: 'Total Registrations', value: stats?.total_registrations ?? 0, icon: Users, color: 'bg-blue-600' },
    { label: 'Revenue', value: formatCurrency(stats?.total_revenue ?? 0), icon: IndianRupee, color: 'bg-emerald-600' },
    { label: 'Checked In Today', value: stats?.checked_in_today ?? 0, icon: CheckCircle, color: 'bg-[#f59e0b]' },
  ];

  const typeBadgeColor = (type: string) => {
    const map: Record<string, string> = {
      conference: 'bg-purple-100 text-purple-700',
      workshop: 'bg-blue-100 text-blue-700',
      seminar: 'bg-green-100 text-green-700',
      meetup: 'bg-amber-100 text-amber-700',
      webinar: 'bg-cyan-100 text-cyan-700',
    };
    return map[type?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-5 flex items-center gap-4">
            <div className={`${s.color} text-white p-3 rounded-lg`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#4c1d95" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No revenue data to display
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => (
              <div key={ev._id || ev.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{ev.title || ev.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeColor(ev.type)}`}>
                    {ev.type || 'Event'}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(ev.date)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {ev.venue || 'TBD'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {ev.registrations_count ?? 0} / {ev.max_attendees ?? '∞'} registered
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-gray-400">
            <Calendar className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No upcoming events</p>
          </div>
        )}
      </div>
    </div>
  );
}
