import { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
export default function Events() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => { setLoading(false); }, []);
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  return (<div className="space-y-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Calendar className="h-6 w-6 text-accent" /> Events</h2><button className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90"><Plus className="h-4 w-4" /> Add New</button></div><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none" /></div><div className="bg-white rounded-xl border p-6"><p className="text-gray-500 text-sm">Manage events here.</p></div></div>);
}