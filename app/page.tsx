'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

// The 4 clients defined in your n8n aggregator
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

  // Real-time listener for updates
  useEffect(() => {
    if (jobs.length === 0) return
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transcriptions' }, 
      (payload) => {
        setJobs(prev => prev.map(j => j.id === payload.new.id ? payload.new : j))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [jobs.length])

  const triggerWorkflow = async () => {
    setLoading(true)
    try {
      // Calling your Next.js API route to bypass CORS
      const res = await fetch('/api/trigger', { method: 'POST' })
      const data = await res.json()
      
      if (data.ids) {
        const { data: initialData } = await supabase.from('transcriptions').select().in('id', data.ids)
        if (initialData) setJobs(initialData)
      }
    } catch (e) {
      console.error("Trigger failed", e)
    } finally {
      setLoading(false)
    }
  }

  const currentJob = jobs[activeIdx]
  // Access the specific report based on the toggle
  const currentReportHtml = currentJob?.report_html?.[activeClient] || ""

  return (
    <main className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* COLUMN 1: VIDEO LIST */}
      <section className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-tight text-white mb-4">Guinea Intel</h1>
          <button 
            onClick={triggerWorkflow}
            disabled={loading}
            className={`w-full py-2.5 rounded-md text-sm font-semibold transition-all ${
              loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {loading ? 'PROCESSING...' : 'RUN PIPELINE'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {jobs.map((job, i) => (
            <button 
              key={job.id}
              onClick={() => setActiveIdx(i)}
              className={`w-full p-3 rounded-lg text-left border transition-all ${
                activeIdx === i ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <p className="text-xs font-mono truncate text-slate-400 mb-2">{job.video_url}</p>
              <div className="flex justify-between items-center">
                <span className={`text-[10px] uppercase font-bold ${job.status === 'completed' ? 'text-green-400' : 'text-yellow-500'}`}>
                  {job.status || 'pending'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* COLUMN 2: TRANSCRIPT */}
      <section className="w-1/3 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-900/30">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Master Transcript</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-slate-400 font-mono whitespace-pre-wrap">
          {currentJob?.transcript || "Awaiting transcription data..."}
        </div>
      </section>

      {/* COLUMN 3: MULTI-CLIENT REPORTS */}
      <section className="flex-1 flex flex-col bg-slate-900/20">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Strategic Analysis</span>
          
          {/* CLIENT TABS */}
          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800">
            {CLIENTS.map(client => (
              <button
                key={client.id}
                onClick={() => setActiveClient(client.id)}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${
                  activeClient === client.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
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
            <div className="h-full flex items-center justify-center text-slate-600 italic">
              Generating report for {activeClient.replace('_', ' ')}...
            </div>
          )}
        </div>
      </section>

    </main>
  )
}