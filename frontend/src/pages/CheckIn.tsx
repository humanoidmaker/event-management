import { useState, useEffect } from 'react';
import { ScanLine, Search, Loader2, CheckCircle, UserCheck, Users, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function CheckIn() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    api.get('/events').then((r) => {
      const list = r.data.data || r.data || [];
      setEvents(list);
      if (list.length > 0) setSelectedEvent(list[0]._id || list[0].id);
    }).catch(() => toast.error('Failed to load events'));
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadStats();
      setResults([]);
      setSearch('');
    }
  }, [selectedEvent]);

  const loadStats = async () => {
    try {
      const { data } = await api.get(`/registrations?event_id=${selectedEvent}`);
      const regs = data.data || data || [];
      setTotalCount(regs.length);
      setCheckedInCount(regs.filter((r: any) => r.status === 'checked_in' || r.checked_in).length);
    } catch {}
  };

  const handleSearch = async () => {
    if (!search.trim() || !selectedEvent) return;
    setSearching(true);
    try {
      const { data } = await api.get(`/registrations?event_id=${selectedEvent}&q=${encodeURIComponent(search)}`);
      const regs = data.data || data || [];
      // Also try filtering client side if API doesn't support q param
      const q = search.toLowerCase();
      const filtered = regs.filter((r: any) =>
        (r.name || r.attendee_name || '').toLowerCase().includes(q) ||
        (r.email || r.attendee_email || '').toLowerCase().includes(q) ||
        (r.registration_number || '').toLowerCase().includes(q)
      );
      setResults(filtered.length > 0 ? filtered : regs);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async (registration: any) => {
    const id = registration._id || registration.id;
    setCheckingIn(id);
    try {
      await api.put(`/registrations/${id}/check-in`);
      toast.success(`${registration.name || registration.attendee_name} checked in!`);
      setResults((prev) => prev.map((r) =>
        (r._id || r.id) === id ? { ...r, status: 'checked_in', checked_in: true, checked_in_at: new Date().toISOString() } : r
      ));
      setCheckedInCount((c) => c + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(null);
    }
  };

  const isCheckedIn = (r: any) => r.status === 'checked_in' || r.checked_in;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-[#f59e0b]" /> Check-In
        </h2>
      </div>

      {/* Event selector */}
      <select
        value={selectedEvent}
        onChange={(e) => setSelectedEvent(e.target.value)}
        className="w-full sm:w-80 border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
      >
        <option value="">Select Event</option>
        {events.map((e) => (
          <option key={e._id || e.id} value={e._id || e.id}>{e.title || e.name}</option>
        ))}
      </select>

      {selectedEvent && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{checkedInCount}</p>
                <p className="text-sm text-gray-500">Checked In</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                <p className="text-sm text-gray-500">Total Registered</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-5 flex items-center gap-4 col-span-2 sm:col-span-1">
              <div className="bg-amber-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCount - checkedInCount}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Attendee</h3>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name, email, or registration number..."
                  className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]/30 outline-none"
                />
              </div>
              <button onClick={handleSearch} disabled={searching}
                className="px-6 py-3 bg-[#4c1d95] text-white rounded-lg text-sm font-medium hover:bg-[#5b21b6] disabled:opacity-50 flex items-center gap-2">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((r) => {
                const checked = isCheckedIn(r);
                return (
                  <div key={r._id || r.id}
                    className={`bg-white rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      checked ? 'border-green-200 bg-green-50/30' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{r.name || r.attendee_name}</h4>
                        {checked && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Checked In
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 space-y-0.5">
                        <p>{r.email || r.attendee_email}</p>
                        <p className="text-xs">
                          <span className="text-gray-400">Reg #:</span> {r.registration_number || r.qr_code || 'N/A'}
                          {' | '}
                          <span className="text-gray-400">Ticket:</span> {r.ticket_name || r.ticket_type || 'General'}
                        </p>
                        {checked && r.checked_in_at && (
                          <p className="text-xs text-green-600">Checked in at {formatDate(r.checked_in_at)}</p>
                        )}
                      </div>
                    </div>
                    {!checked ? (
                      <button
                        onClick={() => handleCheckIn(r)}
                        disabled={checkingIn === (r._id || r.id)}
                        className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold text-base hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                      >
                        {checkingIn === (r._id || r.id) ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                        Check In
                      </button>
                    ) : (
                      <div className="px-8 py-3 bg-green-100 text-green-700 rounded-lg font-semibold text-base flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Done
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {results.length === 0 && search && !searching && (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">No attendees found matching your search</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
