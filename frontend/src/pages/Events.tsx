import { useState, useEffect } from 'react';
import {
  Calendar, Plus, Search, Loader2, X, MapPin, Users, Clock, IndianRupee, Ticket, Truck, Wallet,
  Eye, ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const EVENT_TYPES = ['conference', 'workshop', 'seminar', 'meetup', 'webinar', 'concert', 'exhibition'];

const typeBadge = (type: string) => {
  const map: Record<string, string> = {
    conference: 'bg-purple-100 text-purple-700',
    workshop: 'bg-blue-100 text-blue-700',
    seminar: 'bg-green-100 text-green-700',
    meetup: 'bg-amber-100 text-amber-700',
    webinar: 'bg-cyan-100 text-cyan-700',
    concert: 'bg-pink-100 text-pink-700',
    exhibition: 'bg-indigo-100 text-indigo-700',
  };
  return map[type?.toLowerCase()] || 'bg-gray-100 text-gray-700';
};

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailData, setDetailData] = useState<{ tickets: any[]; registrations: number; vendors: any[]; budget: any } | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', type: 'conference', date: '', end_date: '', venue: '', description: '',
    max_attendees: 100, published: true,
  });

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const { data } = await api.get('/events');
      setEvents(data.data || data || []);
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.date) return toast.error('Title and date are required');
    setSaving(true);
    try {
      await api.post('/events', form);
      toast.success('Event created');
      setShowCreate(false);
      setForm({ title: '', type: 'conference', date: '', end_date: '', venue: '', description: '', max_attendees: 100, published: true });
      loadEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error creating event');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (ev: any) => {
    setDetail(ev);
    setDetailData(null);
    try {
      const eventId = ev._id || ev.id;
      const [ticketsRes, vendorsRes, budgetRes] = await Promise.allSettled([
        api.get(`/tickets/event/${eventId}`),
        api.get(`/vendors?event_id=${eventId}`),
        api.get(`/budget/event/${eventId}/summary`),
      ]);
      setDetailData({
        tickets: ticketsRes.status === 'fulfilled' ? (ticketsRes.value.data.data || ticketsRes.value.data || []) : [],
        registrations: ev.registrations_count ?? 0,
        vendors: vendorsRes.status === 'fulfilled' ? (vendorsRes.value.data.data || vendorsRes.value.data || []) : [],
        budget: budgetRes.status === 'fulfilled' ? (budgetRes.value.data.data || budgetRes.value.data || {}) : {},
      });
    } catch {
      setDetailData({ tickets: [], registrations: 0, vendors: [], budget: {} });
    }
  };

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    return (e.title || e.name || '').toLowerCase().includes(q) ||
      (e.venue || '').toLowerCase().includes(q) ||
      (e.type || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-[#f59e0b]" /> Events
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium hover:bg-[#5b21b6] transition"
        >
          <Plus className="h-4 w-4" /> Create Event
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events by name, venue, type..."
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
        />
      </div>

      {/* Event Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ev) => (
            <div
              key={ev._id || ev.id}
              onClick={() => openDetail(ev)}
              className="bg-white rounded-xl border p-5 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-[#4c1d95] transition-colors">
                  {ev.title || ev.name}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${typeBadge(ev.type)}`}>
                  {ev.type}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(ev.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="line-clamp-1">{ev.venue || 'Venue TBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>{ev.registrations_count ?? 0} / {ev.max_attendees ?? '∞'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                {ev.published ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Published</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Draft</span>
                )}
                <span className="text-xs text-gray-400 flex items-center gap-1 group-hover:text-[#4c1d95]">
                  View details <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No events found</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-[#4c1d95] hover:underline">
            Create your first event
          </button>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Create Event</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Annual Tech Conference" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.max_attendees} onChange={(e) => setForm({ ...form, max_attendees: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Convention Centre, Mumbai" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none" rows={3}
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="rounded border-gray-300 text-[#4c1d95] focus:ring-[#4c1d95]" />
                Publish immediately
              </label>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium hover:bg-[#5b21b6] disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{detail.title || detail.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{formatDate(detail.date)} | {detail.venue || 'TBD'}</p>
              </div>
              <button onClick={() => { setDetail(null); setDetailData(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!detailData ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#f59e0b]" /></div>
            ) : (
              <div className="space-y-5">
                {/* Summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <Ticket className="w-5 h-5 mx-auto text-[#4c1d95] mb-1" />
                    <p className="text-lg font-bold text-gray-900">{detailData.tickets.length}</p>
                    <p className="text-xs text-gray-500">Ticket Types</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <Users className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{detailData.registrations}</p>
                    <p className="text-xs text-gray-500">Registrations</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <Truck className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{detailData.vendors.length}</p>
                    <p className="text-xs text-gray-500">Vendors</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <Wallet className="w-5 h-5 mx-auto text-green-600 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(detailData.budget?.total_estimated || 0)}</p>
                    <p className="text-xs text-gray-500">Budget</p>
                  </div>
                </div>

                {/* Tickets */}
                {detailData.tickets.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Ticket Types</h3>
                    <div className="space-y-2">
                      {detailData.tickets.map((t: any, i: number) => (
                        <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <span className="font-medium text-sm">{t.name || t.type}</span>
                            <span className="text-xs text-gray-400 ml-2">{t.sold || 0} / {t.quantity || '∞'} sold</span>
                          </div>
                          <span className="font-semibold text-sm text-[#4c1d95]">{formatCurrency(t.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-600">{detail.description}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={() => { setDetail(null); setDetailData(null); }}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
