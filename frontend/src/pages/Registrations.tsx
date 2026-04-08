import { useState, useEffect } from 'react';
import { Users, Plus, Search, Loader2, X, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    checked_in: 'bg-blue-100 text-blue-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

export default function Registrations() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', ticket_id: '',
  });

  useEffect(() => {
    api.get('/events').then((r) => {
      const list = r.data.data || r.data || [];
      setEvents(list);
      if (list.length > 0) setSelectedEvent(list[0]._id || list[0].id);
    }).catch(() => toast.error('Failed to load events')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedEvent) loadRegistrations();
  }, [selectedEvent]);

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const [regRes, ticketRes] = await Promise.all([
        api.get(`/registrations?event_id=${selectedEvent}`),
        api.get(`/tickets/event/${selectedEvent}`),
      ]);
      setRegistrations(regRes.data.data || regRes.data || []);
      setTickets(ticketRes.data.data || ticketRes.data || []);
    } catch {
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.name || !form.email) return toast.error('Name and email required');
    if (!form.ticket_id) return toast.error('Please select a ticket type');
    setSaving(true);
    try {
      await api.post('/registrations', { ...form, event_id: selectedEvent });
      toast.success('Registration successful');
      setShowRegister(false);
      setForm({ name: '', email: '', phone: '', ticket_id: '' });
      loadRegistrations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this registration?')) return;
    try {
      await api.put(`/registrations/${id}/cancel`);
      toast.success('Registration cancelled');
      loadRegistrations();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Ticket Type', 'Amount', 'Status', 'QR Code'];
    const rows = filtered.map((r) => [
      r.name || r.attendee_name, r.email || r.attendee_email, r.phone || '',
      r.ticket_name || r.ticket_type || '', r.amount || 0, r.status, r.qr_code || r.registration_number || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c: any) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${selectedEvent}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    return (r.name || r.attendee_name || '').toLowerCase().includes(q) ||
      (r.email || r.attendee_email || '').toLowerCase().includes(q) ||
      (r.registration_number || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-[#f59e0b]" /> Registrations
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium hover:bg-[#5b21b6]">
            <Plus className="h-4 w-4" /> Register Attendee
          </button>
        </div>
      </div>

      {/* Event selector + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none sm:w-64"
        >
          <option value="">Select Event</option>
          {events.map((e) => (
            <option key={e._id || e.id} value={e._id || e.id}>{e.title || e.name}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or registration #..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" /></div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Ticket Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">QR / Reg #</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id || r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{r.name || r.attendee_name}</td>
                  <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">{r.email || r.attendee_email}</td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                      {r.ticket_name || r.ticket_type || 'General'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{formatCurrency(r.amount || 0)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(r.status)}`}>
                      {r.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs font-mono hidden lg:table-cell">
                    {r.qr_code || r.registration_number || '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {r.status !== 'cancelled' && (
                      <button onClick={() => handleCancel(r._id || r.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">{selectedEvent ? 'No registrations found' : 'Select an event to view registrations'}</p>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Register Attendee</h2>
              <button onClick={() => setShowRegister(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Type *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.ticket_id} onChange={(e) => setForm({ ...form, ticket_id: e.target.value })}>
                  <option value="">Select ticket</option>
                  {tickets.map((t) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.name || t.type} - {formatCurrency(t.price)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowRegister(false)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRegister} disabled={saving}
                className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium hover:bg-[#5b21b6] disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
