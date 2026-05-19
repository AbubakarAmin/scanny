import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Stats States
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
    pending: 0
  })

  useEffect(() => {
    fetchTickets()

    // Subscribe to realtime postgres changes on public.tickets table
    const channel = supabase
      .channel('realtime-tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          // Refetch data on insert, update or delete
          fetchTickets()
        }
      )
      .subscribe()

    // Fallback polling: Refresh data every 30 seconds
    const intervalId = setInterval(() => {
      fetchTickets()
    }, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(intervalId)
    }
  }, [])

  // Calculate statistics whenever tickets state changes
  useEffect(() => {
    const total = tickets.length
    const checkedIn = tickets.filter(t => t.checked_in && !t.checked_out).length
    const checkedOut = tickets.filter(t => t.checked_out).length
    const pending = tickets.filter(t => !t.checked_in && !t.checked_out).length

    setStats({ total, checkedIn, checkedOut, pending })
  }, [tickets])

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(data || [])
    } catch (err) {
      console.error("Error fetching tickets:", err.message)
    } finally {
      setLoading(false)
    }
  }

  // Get status text and style class for badges
  const getStatus = (ticket) => {
    if (ticket.checked_out) return { label: 'Checked Out', css: 'bg-brand-info/10 text-brand-info border-brand-info/20' }
    if (ticket.checked_in) return { label: 'Checked In', css: 'bg-brand-success/10 text-brand-success border-brand-success/20' }
    return { label: 'Pending', css: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
  }

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')'
  }

  // Filtered tickets depending on search query and status drop-down selection
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !ticket.checked_in && !ticket.checked_out) ||
      (statusFilter === 'checked_in' && ticket.checked_in && !ticket.checked_out) ||
      (statusFilter === 'checked_out' && ticket.checked_out)

    return matchesSearch && matchesStatus
  })

  // Export tickets table to CSV
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      toast.error("No ticket records available to export.")
      return
    }

    const headers = ['Ticket Number', 'Student Name', 'Class', 'Roll Number', 'Status', 'Check-In Time', 'Checked-In By', 'Check-Out Time', 'Checked-Out By']
    
    const rows = filteredTickets.map(t => {
      let statusText = 'Pending'
      if (t.checked_out) statusText = 'Checked Out'
      else if (t.checked_in) statusText = 'Checked In'

      return [
        t.ticket_number,
        `"${t.student_name.replace(/"/g, '""')}"`,
        t.class,
        t.roll_no,
        statusText,
        t.checked_in_at ? new Date(t.checked_in_at).toLocaleString() : '—',
        t.checked_in_by || '—',
        t.checked_out_at ? new Date(t.checked_out_at).toLocaleString() : '—',
        t.checked_out_by || '—'
      ]
    })

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `event_tickets_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV file exported successfully! 📊")
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-8 border-b border-brand-border/40 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Event Operations Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Real-time status overview of student check-ins and check-outs.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn-primary flex items-center justify-center space-x-2 text-sm font-semibold"
        >
          <span>Export filtered CSV 📊</span>
        </button>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered</p>
          <p className="text-3xl font-extrabold text-white mt-2">{stats.total}</p>
          <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500"></div>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Currently In</p>
          <p className="text-3xl font-extrabold text-brand-success mt-2">{stats.checkedIn}</p>
          <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-success"></div>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Checked Out</p>
          <p className="text-3xl font-extrabold text-brand-info mt-2">{stats.checkedOut}</p>
          <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-info"></div>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Arrival</p>
          <p className="text-3xl font-extrabold text-slate-300 mt-2">{stats.pending}</p>
          <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-500"></div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="glass-panel p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:max-w-md relative">
          <input
            type="text"
            placeholder="Search by student name, roll number, or ticket #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-dark/50 border border-brand-border/60 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-all"
          />
          <span className="absolute left-3.5 top-3 text-slate-400">🔍</span>
        </div>

        <div className="w-full md:w-auto flex items-center space-x-2">
          <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-brand-dark border border-brand-border/60 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-accent"
          >
            <option value="all">All Tickets</option>
            <option value="pending">Pending</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <div className="w-10 h-10 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">Loading student registry...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <span className="text-4xl block mb-2">📋</span>
              <p className="text-sm font-semibold text-slate-400">No matching tickets found.</p>
              <p className="text-xs text-slate-500 mt-1">Try tweaking your search terms or filter constraints.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-card/45 border-b border-brand-border/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Ticket No</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Roll</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Check-In Time</th>
                  <th className="px-6 py-4">Check-Out Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30 text-sm">
                {filteredTickets.map((ticket) => {
                  const badge = getStatus(ticket)
                  return (
                    <tr 
                      key={ticket.id}
                      className="bg-brand-card/10 hover:bg-brand-card/35 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-brand-accent">
                        {ticket.ticket_number}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {ticket.student_name}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {ticket.class}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {ticket.roll_no}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg border ${badge.css}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {formatDate(ticket.checked_in_at)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {formatDate(ticket.checked_out_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
