import { useState, useEffect } from 'react';
import { Wallet, Plus, Loader2, X, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const CATEGORIES = ['venue', 'catering', 'decoration', 'sound_lighting', 'marketing', 'printing', 'transport', 'hospitality', 'security', 'miscellaneous'];

export default function Budget() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    category: 'venue', description: '', estimated_amount: 0, actual_amount: 0, notes: '',
  });

  useEffect(() => {
    api.get('/events').then((r) => {
      const list = r.data.data || r.data || [];
      setEvents(list);
      if (list.length > 0) setSelectedEvent(list[0]._id || list[0].id);
    }).catch(() => toast.error('Failed to load events')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedEvent) loadBudget();
  }, [selectedEvent]);

  const loadBudget = async () => {
    setLoading(true);
    try {
      const [budgetRes, summaryRes] = await Promise.allSettled([
        api.get(`/budget?event_id=${selectedEvent}`),
        api.get(`/budget/event/${selectedEvent}/summary`),
      ]);
      setItems(budgetRes.status === 'fulfilled' ? (budgetRes.value.data.data || budgetRes.value.data || []) : []);
      setSummary(summaryRes.status === 'fulfilled' ? (summaryRes.value.data.data || summaryRes.value.data) : null);
    } catch {
      toast.error('Failed to load budget');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.category || !form.description) return toast.error('Category and description required');
    setSaving(true);
    try {
      await api.post('/budget', { ...form, event_id: selectedEvent });
      toast.success('Budget item added');
      setShowAdd(false);
      setForm({ category: 'venue', description: '', estimated_amount: 0, actual_amount: 0, notes: '' });
      loadBudget();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error adding item');
    } finally {
      setSaving(false);
    }
  };

  const totalEstimated = items.reduce((s, i) => s + (i.estimated_amount || 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const totalVariance = totalEstimated - totalActual;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-[#f59e0b]" /> Budget
        </h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium hover:bg-[#5b21b6]">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {/* Event selector */}
      <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}
        className="w-full sm:w-80 border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none">
        <option value="">Select Event</option>
        {events.map((e) => (
          <option key={e._id || e.id} value={e._id || e.id}>{e.title || e.name}</option>
        ))}
      </select>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" /></div>
      ) : selectedEvent ? (
        <>
          {/* Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-2 rounded-lg"><IndianRupee className="w-5 h-5 text-blue-600" /></div>
                <span className="text-sm text-gray-500">Estimated Budget</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.total_estimated || totalEstimated)}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-100 p-2 rounded-lg"><IndianRupee className="w-5 h-5 text-amber-600" /></div>
                <span className="text-sm text-gray-500">Actual Spent</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.total_actual || totalActual)}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`${totalVariance >= 0 ? 'bg-green-100' : 'bg-red-100'} p-2 rounded-lg`}>
                  {totalVariance >= 0 ? <TrendingDown className="w-5 h-5 text-green-600" /> : <TrendingUp className="w-5 h-5 text-red-600" />}
                </div>
                <span className="text-sm text-gray-500">Variance</span>
              </div>
              <p className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalVariance >= 0 ? '-' : '+'}{formatCurrency(Math.abs(totalVariance))}
              </p>
              <p className="text-xs text-gray-400 mt-1">{totalVariance >= 0 ? 'Under budget' : 'Over budget'}</p>
            </div>
          </div>

          {/* Budget Table */}
          {items.length > 0 ? (
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Estimated</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Actual</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const variance = (item.estimated_amount || 0) - (item.actual_amount || 0);
                    return (
                      <tr key={item._id || item.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium capitalize">
                            {(item.category || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {item.description}
                          {item.notes && <span className="block text-xs text-gray-400 mt-0.5">{item.notes}</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.estimated_amount || 0)}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.actual_amount || 0)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {variance >= 0 ? '-' : '+'}{formatCurrency(Math.abs(variance))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-3 px-4" colSpan={2}>Total</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(totalEstimated)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(totalActual)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {totalVariance >= 0 ? '-' : '+'}{formatCurrency(Math.abs(totalVariance))}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">No budget items yet</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-[#4c1d95] hover:underline">Add your first item</button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Select an event to view budget</p>
        </div>
      )}

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Add Budget Item</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., Main hall rental" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Amount</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.estimated_amount} onChange={(e) => setForm({ ...form, estimated_amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Amount</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                    value={form.actual_amount} onChange={(e) => setForm({ ...form, actual_amount: Number(e.target.value) })} />
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
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
