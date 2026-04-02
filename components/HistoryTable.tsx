'use client'

interface HistoryTableProps {
  jobs: any[];
  onSelect: (index: number) => void;
  activeId?: string;
}

export default function HistoryTable({ jobs, onSelect, activeId }: HistoryTableProps) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mt-8">
      <div className="p-4 border-b border-slate-800 bg-slate-900/80">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Processing History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800 bg-slate-950/50">
              <th className="px-6 py-3 font-semibold">Video URL</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Date</th>
              <th className="px-6 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {jobs.map((job, idx) => (
              <tr 
                key={job.id} 
                className={`group hover:bg-slate-800/40 transition-colors ${activeId === job.id ? 'bg-blue-500/5' : ''}`}
              >
                <td className="px-6 py-4 font-mono text-xs text-slate-400 max-w-[300px] truncate">
                  {job.video_url}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    job.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {job.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {new Date(job.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onSelect(idx)}
                    className="text-blue-400 hover:text-blue-300 text-xs font-bold underline underline-offset-4"
                  >
                    VIEW DATA
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}