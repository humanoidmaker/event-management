import { useState, useEffect } from 'react';
import { Truck, Plus, Search, Loader2, X, IndianRupee, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const SERVICE_TYPES = ['catering', 'decoration', 'sound', 'lighting', 'photography', 'videography', 'security', 'transport', 'printing', 'other'];

const serviceTypeBadge = (type: string) => {
  const map: Record<string, string> = {
    catering: 'bg-orange-100 text-orange-700',
    decoration: 'bg-pink-100 text-pink-700',
    sound: 'bg-blue-100 text-blue-700',
    lighting: 'bg-yellow-100 text-yellow-700',
    photography: 'bg-purple-100 text-purple-700',
    videography: 'bg-indigo-100 text-indigo-700',
    security: 'bg-red-100 text-red-700',
    transport: 'bg-green-100 text-green-700',
  };
  return map[type?.toLowerCase()] || 'bg-gray-100 text-gray-700';
};

const statusColor = (status: string) => {
  const map: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

export default function Vendors() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', service_type: 'catering', contact_person: '', phone: '', email: '',
    contract_amount: 0, paid_amount: 0, status: 'pending', notes: '',
  });

  useEffect(() => {
    api.get('/events').then((r) => {
      const list = r.data.data || r.data || [];
      setEvents(list);
      if (list.length > 0) setSelectedEvent(list[0]._id || list[0].id);
    }).catch(() => toast.error('Failed to load events')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedEvent) loadVendors();
  }, [selectedEvent]);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/vendors?event_id=${selectedEvent}`);
      setVendors(data.data || data || []);
    } catch {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.service_type) return toast.error('Name and service type are required');
    setSaving(true);
    try {
      await api.post('/vendors', { ...form, event_id: selectedEvent });
      toast.success('Vendor added');
      setShowAdd(false);
      setForm({ name: '', service_type: 'catering', contact_person: '', phone: '', email: '', contract_amount: 0, paid_amount: 0, status: 'pending', notes: '' });
      loadVendors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error adding vendor');
    } finally {
      setSaving(false);
    }
  };

  const filtered = vendors.filter((v) => {
    const q = search.toLowerCase();
    return v.name.toLowerCase().includes(q) || (v.service_type || '').toLowerCase().includes(q);
  });

  const totalContract = vendors.reduce((s, v) => s + (v.contract_amount || 0), 0);
  const totalPaid = vendors.reduce((s, v) => s + (v.paid_amount || 0), 0);
  const totalPending = totalContract - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="h-6 w-6 text-[#f59e0b]" /> Vendors
        </h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium hover:bg-[#5b21b6]">
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      {/* Event selector + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}
          className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none sm:w-64">
          <option value="">Select Event</option>
          {events.map((e) => (
            <option key={e._id || e.id} value={e._id || e.id}>{e.title || e.name}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none" />
        </div>
      </div>

      {/* Payment Summary */}
      {selectedEvent && vendors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-lg"><IndianRupee className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalContract)}</p>
              <p className="text-xs text-gray-500">Total Contract</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <div className="bg-green-100 p-2.5 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-gray-500">Total Paid</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <div className={`${totalPending > 0 ? 'bg-red-100' : 'bg-green-100'} p-2.5 rounded-lg`}>
              {totalPending > 0 ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-gray-500">Pending Payment</p>
            </div>
          </div>
        </div>
      )}

      {/* Vendor List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" /></div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Vendor</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Service Type</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Contract</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">Paid</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Pending</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const pending = (v.contract_amount || 0) - (v.paid_amount || 0);
                return (
                  <tr key={v._id || v.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{v.name}</div>
                      {v.contact_person && <div className="text-xs text-gray-400">{v.contact_person} | {v.phone}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${serviceTypeBadge(v.service_type)}`}>
                        {v.service_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(v.contract_amount || 0)}</td>
                    <td className="py-3 px-4 text-right text-green-600 hidden sm:table-cell">{formatCurrency(v.paid_amount || 0)}</td>
                    <td className="py-3 px-4 text-right hidden md:table-cell">
                      <span className={pending > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {formatCurrency(pending)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(v.status)}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">{selectedEvent ? 'No vendors assigned' : 'Select an event to view vendors'}</p>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Add Vendor</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}>
                    {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Amount</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.contract_amount} onChange={(e) => setForm({ ...form, contract_amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none" rows={2}
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={saving}
                className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium hover:bg-[#5b21b6] disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
