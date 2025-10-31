import { useState } from 'react';
import { supabase } from '../utils/supabase';

export function DebugQuery() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkSpecificRequest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('id, title, status, is_played, is_locked, created_at')
        .eq('id', '159e1f84-599d-4e93-94c1-52f9da3ed743')
        .single();
      
      console.log('🔍 Direct query result:', { data, error });
      setResult({ data, error });
    } catch (e) {
      console.error('Query error:', e);
      setResult({ error: e });
    } finally {
      setLoading(false);
    }
  };

  const checkPendingRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('id, title, status, is_played, is_locked, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('🔍 Pending requests query:', { data, error });
      setResult({ data, error });
    } catch (e) {
      console.error('Query error:', e);
      setResult({ error: e });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-effect rounded-lg p-4 mb-4">
      <div className="text-xs uppercase tracking-wider text-neon-pink mb-3">Debug Query</div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={checkSpecificRequest}
          disabled={loading}
          className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          Check Specific Request
        </button>
        <button
          onClick={checkPendingRequests}
          disabled={loading}
          className="px-3 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
        >
          Check Pending Requests
        </button>
      </div>
      {loading && <div className="text-gray-300 text-sm">Loading...</div>}
      {result && (
        <pre className="text-xs text-gray-300 bg-black/20 rounded p-2 overflow-auto max-h-40">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
