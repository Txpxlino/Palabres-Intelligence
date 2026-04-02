'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import HistoryTable from '@/components/HistoryTable'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

const CLIENTS = [
  { id: 'Client_A', label: 'Client A' },
  { id: 'Client_B', label: 'Client B' },
  { id: 'Client_C', label: 'Client C' },
  { id: 'Client_D', label: 'Client D' },
]

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [activeClient, setActiveClient] = useState('Client_A')
  const [loading, setLoading] = useState(false)

  // 1. Initial Load: Fetch latest 20 records
  useEffect(() => {
    const fetchInitialJobs = async () => {
      const { data } = await supabase
        .from('transcriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setJobs(data)
    }
    fetchInitialJobs()
  }, [])

  // 2. Real-time Listener: Updates state on DB changes
  useEffect(() => {
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transcriptions' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs(prev => {
              // Safety check: Don't add if ID already exists (prevents race condition with triggerWorkflow)
              if (prev.some(j => j.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => prev.map(j => {
              if (j.id === payload.new.id) {
                // Merge logic to prevent transcript disappearing when reports update
                return { 
                  ...j, 
                  ...payload.new, 
                  transcript: payload.new.transcript || j.transcript 
                }
              }
              return j
            }))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // 3. Trigger Workflow: Fetches specific IDs returned by n8n
  const triggerWorkflow = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/trigger', { method: 'POST' })
      const data = await res.json()
      
      if (data.ids) {
        const { data: initialData } = await supabase
          .from('transcriptions')
          .select()
          .in('id', data.ids)
          
        if (initialData) {
          setJobs(prev => {
            // DE-DUPLICATION: Filter out jobs already caught by the real-time listener
            const existingIds = new Set(prev.map(j => j.id));
            const uniqueNewJobs = initialData.filter(j => !existingIds.has(j.id));
            return [...uniqueNewJobs, ...prev];
          });
          // Set focus to the newest job
          setActiveIdx(0);
        }
      }
    } catch (e) {
      console.error("Trigger failed", e)
    } finally {
      setLoading(false)
    }
  }

  const currentJob = jobs[activeIdx]
  const currentReportHtml = currentJob?.report_html?.[activeClient] || ""

  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-200 font-sans p-6 overflow-y-auto">
      
      {/* HEADER SECTION */}
      <div className="max-w-[1600px] mx-auto mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Guinea Intel Dashboard</h1>
          <p className="text-slate-500 text-sm">Strategic Monitoring & Content Analysis</p>
        </div>
        <button 
          onClick={triggerWorkflow}
          disabled={loading}
          className={`px-8 py-3 rounded-lg text-sm font-bold transition-all shadow-lg ${
            loading ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
          }`}
        >
          {loading ? 'PROCESSING...' : 'RUN PIPELINE'}
        </button>
      </div>

      {/* TOP SECTION: THE 3-COLUMN WORKSPACE */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6 h-[700px]">
        
        {/* COL 1: ACTIVE QUEUE */}
        <section className="col-span-3 border border-slate-800 bg-slate-900/30 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Active Workspace
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {jobs.slice(0, 8).map((job, i) => (
              <button 
                key={job.id} // Fixed: use unique ID, not index
                onClick={() => setActiveIdx(i)}
                className={`w-full p-3 rounded-lg text-left border transition-all ${
                  activeIdx === i ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className="text-[10px] font-mono truncate text-slate-400 mb-1">{job.video_url}</p>
                <span className={`text-[9px] uppercase font-bold ${job.status === 'completed' ? 'text-green-400' : 'text-yellow-500'}`}>
                  {job.status || 'pending'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* COL 2: TRANSCRIPT */}
        <section className="col-span-4 border border-slate-800 bg-slate-900/30 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Master Transcript
          </div>
          <div className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-slate-400 font-mono whitespace-pre-wrap">
            {currentJob?.transcript || "Select a video to view transcript..."}
          </div>
        </section>

        {/* COL 3: REPORTS */}
        <section className="col-span-5 border border-slate-800 bg-slate-900/30 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Strategic Analysis</span>
            <div className="flex bg-slate-950 p-1 rounded border border-slate-800 gap-1">
              {CLIENTS.map(client => (
                <button
                  key={client.id}
                  onClick={() => setActiveClient(client.id)}
                  className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${
                    activeClient === client.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {client.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 prose prose-invert prose-slate max-w-none">
            {currentReportHtml ? (
              <div dangerouslySetInnerHTML={{ __html: currentReportHtml }} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">
                Awaiting analysis for {activeClient}...
              </div>
            )}
          </div>
        </section>
      </div>

      {/* BOTTOM SECTION: HISTORY */}
      <div className="max-w-[1600px] mx-auto mt-8">
        <HistoryTable 
          jobs={jobs} 
          onSelect={(idx) => setActiveIdx(idx)} 
          activeId={currentJob?.id}
        />
      </div>

    </main>
  )
}