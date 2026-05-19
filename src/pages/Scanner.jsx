import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Html5Qrcode } from 'html5-qrcode'
import toast from 'react-hot-toast'

export default function Scanner() {
  const [cameraPermission, setCameraPermission] = useState(null) // null = checking, true = granted, false = denied
  const [scanStatus, setScanStatus] = useState('scanning') // scanning, processing, checked_in_pending, checked_out_pending, invalid, exited, success
  const [activeTicket, setActiveTicket] = useState(null)
  
  // Counter stats
  const [checkedInCount, setCheckedInCount] = useState(0)
  const [checkedOutCount, setCheckedOutCount] = useState(0)
  
  // Resuming timer counter
  const [resumeTimer, setResumeTimer] = useState(0)

  // Scanner references
  const scannerRef = useRef(null)
  const statusRef = useRef('scanning')
  
  // Debounce helpers
  const lastScanText = useRef('')
  const lastScanTime = useRef(0)

  // Sync ref with state for use inside qr callback
  useEffect(() => {
    statusRef.current = scanStatus
  }, [scanStatus])

  useEffect(() => {
    fetchScannerStats()
    initializeScanner()

    return () => {
      stopScanner()
    }
  }, [])

  // Auto-resume timer countdown effect
  useEffect(() => {
    let interval = null
    if (resumeTimer > 0) {
      interval = setInterval(() => {
        setResumeTimer(prev => prev - 1)
      }, 1000)
    } else if (resumeTimer === 0 && (scanStatus === 'invalid' || scanStatus === 'exited' || scanStatus === 'success')) {
      resumeScanning()
    }
    return () => clearInterval(interval)
  }, [resumeTimer, scanStatus])

  const fetchScannerStats = async () => {
    try {
      // Get checked in count
      const { count: checkedIn, error: inErr } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('checked_in', true)

      if (inErr) throw inErr
      setCheckedInCount(checkedIn || 0)

      // Get checked out count
      const { count: checkedOut, error: outErr } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('checked_out', true)

      if (outErr) throw outErr
      setCheckedOutCount(checkedOut || 0)
    } catch (err) {
      console.error("Error fetching stats:", err.message)
    }
  }

  const initializeScanner = async () => {
    try {
      // Instantiate html5-qrcode
      const html5QrCode = new Html5Qrcode("reader")
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7
            return { width: size, height: size }
          }
        },
        onScanSuccess,
        onScanFailure
      )
      setCameraPermission(true)
    } catch (err) {
      console.error("Camera start failure:", err)
      setCameraPermission(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
    }
  }

  const resumeScanning = () => {
    setActiveTicket(null)
    setScanStatus('scanning')
    setResumeTimer(0)
    // Prevent immediately rescanning the same code upon resuming
    lastScanTime.current = Date.now()
  }

  const onScanSuccess = (decodedText) => {
    // If not actively looking for scans, ignore frames
    if (statusRef.current !== 'scanning') return

    // Debounce check (2 seconds)
    const now = Date.now()
    if (decodedText === lastScanText.current && now - lastScanTime.current < 2000) {
      return
    }
    lastScanText.current = decodedText
    lastScanTime.current = now

    // Update status to processing and fetch candidate ticket
    setScanStatus('processing')
    handleScannedCode(decodedText)
  }

  const onScanFailure = (error) => {
    // Silent failure is normal for frame scanning failures
  }

  const handleScannedCode = async (uuid) => {
    try {
      // Validate if uuid format is valid (basic check)
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
      if (!uuidRegex.test(uuid)) {
        setScanStatus('invalid')
        setResumeTimer(3)
        return
      }

      // Query database
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', uuid)
        .maybeSingle()

      if (error) throw error

      if (!ticket) {
        setScanStatus('invalid')
        setResumeTimer(3)
        return
      }

      setActiveTicket(ticket)

      // Decide status page depending on columns
      if (!ticket.checked_in) {
        // Redirection to Green check-in page
        setScanStatus('checked_in_pending')
      } else if (ticket.checked_in && !ticket.checked_out) {
        // Redirection to Blue check-out page
        setScanStatus('checked_out_pending')
      } else {
        // Redirection to Orange exited page
        setScanStatus('exited')
        setResumeTimer(3)
      }
    } catch (err) {
      toast.error(err.message || "Failed to lookup scanned ticket")
      resumeScanning()
    }
  }

  // Confirm Check-In action
  const handleConfirmCheckIn = async () => {
    if (!activeTicket) return
    const toastId = toast.loading("Confirming check-in...")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email || 'unknown-scanner'

      const { error } = await supabase
        .from('tickets')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
          checked_in_by: email
        })
        .eq('id', activeTicket.id)

      if (error) throw error

      toast.success("Check-In confirmed! ✓", { id: toastId })
      setScanStatus('success')
      setResumeTimer(3)
      fetchScannerStats()
    } catch (err) {
      toast.error(err.message || "Failed to confirm check-in", { id: toastId })
      resumeScanning()
    }
  }

  // Confirm Check-Out action
  const handleConfirmCheckOut = async () => {
    if (!activeTicket) return
    const toastId = toast.loading("Confirming check-out...")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email || 'unknown-scanner'

      const { error } = await supabase
        .from('tickets')
        .update({
          checked_out: true,
          checked_out_at: new Date().toISOString(),
          checked_out_by: email
        })
        .eq('id', activeTicket.id)

      if (error) throw error

      toast.success("Check-Out confirmed! Door exit logged.", { id: toastId })
      setScanStatus('success')
      setResumeTimer(3)
      fetchScannerStats()
    } catch (err) {
      toast.error(err.message || "Failed to confirm check-out", { id: toastId })
      resumeScanning()
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Small Stats Header Banner */}
      <div className="flex items-center justify-between bg-brand-card/65 border border-brand-border/40 p-3 rounded-xl mb-4 text-xs font-semibold text-slate-300">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-success"></span>
          <span>Checked In: <strong className="text-white">{checkedInCount}</strong></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-info"></span>
          <span>Checked Out: <strong className="text-white">{checkedOutCount}</strong></span>
        </div>
      </div>

      {/* Main Camera / Visual Area */}
      <div className="flex-1 flex flex-col justify-between space-y-6">
        
        <div className={`flex-1 flex flex-col justify-center ${scanStatus === 'scanning' ? '' : 'hidden'}`}>
          {cameraPermission === false ? (
            <div className="glass-panel p-8 rounded-2xl text-center space-y-4 border-brand-danger/30">
              <span className="text-5xl block">📷</span>
              <h4 className="text-lg font-bold text-white">Camera Access Blocked</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Please enable camera permission in your mobile browser settings to scan QR tickets.
              </p>
              <button
                onClick={() => {
                  stopScanner().then(() => initializeScanner())
                }}
                className="w-full btn-primary py-2.5 text-xs font-bold"
              >
                Retry Camera Initialization
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-brand-accent animate-pulse-slow">
                  🎥 Camera Scanner Active
                </p>
                <p className="text-xs text-slate-400 mt-1">Align the QR code inside the box to scan</p>
              </div>

              <div className="scanner-container border-2 border-brand-accent/50 shadow-2xl shadow-brand-accent/5">
                <div className="scanner-laser"></div>
                <div id="reader" className="w-full bg-brand-dark/95"></div>
              </div>
            </div>
          )}
        </div>

        {/* PROCESSING STATE BANNER */}
        {scanStatus === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-brand-accent/20 border-t-brand-accent animate-spin"></div>
            <p className="text-sm text-slate-400 font-semibold tracking-wider">Verifying ticket signature...</p>
          </div>
        )}

        {/* INVALID TICKET RED BANNER */}
        {scanStatus === 'invalid' && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="glass-panel p-8 rounded-2xl border-brand-danger/40 bg-brand-danger/10 text-center space-y-6">
              <span className="text-7xl block animate-bounce">❌</span>
              <div>
                <h3 className="text-2xl font-black text-brand-danger tracking-wider uppercase">Invalid Ticket</h3>
                <p className="text-sm text-slate-300 mt-2">
                  This signature or UUID was not found in the Database.
                </p>
              </div>
              <div className="pt-4 border-t border-brand-border/20 text-xs text-slate-400">
                Resuming camera feed in <strong className="text-white">{resumeTimer}s</strong>...
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS STATE BANNER */}
        {scanStatus === 'success' && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="glass-panel p-8 rounded-2xl border-brand-success/40 bg-brand-success/10 text-center space-y-6">
              <span className="text-7xl block animate-bounce">✓</span>
              <div>
                <h3 className="text-2xl font-black text-brand-success tracking-wider uppercase">Access Granted</h3>
                <p className="text-sm text-slate-300 mt-2">
                  Database record successfully updated.
                </p>
              </div>
              <div className="pt-4 border-t border-brand-border/20 text-xs text-slate-400">
                Next scan starting in <strong className="text-white">{resumeTimer}s</strong>...
              </div>
            </div>
          </div>
        )}

        {/* CHECK-IN GREEN BANNER */}
        {scanStatus === 'checked_in_pending' && activeTicket && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="glass-panel p-6 rounded-2xl border-brand-success bg-brand-success/5 space-y-6 shadow-xl shadow-brand-success/5">
              <div className="text-center border-b border-brand-border/40 pb-4">
                <span className="text-4xl block mb-2">✅</span>
                <h3 className="text-lg font-black text-brand-success tracking-widest uppercase">CHECK IN PENDING</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Student Name</span>
                  <span className="text-xl font-bold text-white">{activeTicket.student_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Class</span>
                    <span className="text-md font-bold text-white">{activeTicket.class}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Roll Number</span>
                    <span className="text-md font-bold text-white">#{activeTicket.roll_no}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Ticket Number</span>
                  <span className="font-mono text-brand-accent font-bold">{activeTicket.ticket_number}</span>
                </div>
              </div>

              <div className="flex flex-col space-y-3 pt-4">
                <button
                  onClick={handleConfirmCheckIn}
                  className="w-full py-3.5 bg-brand-success hover:bg-emerald-600 text-brand-dark font-extrabold rounded-xl transition-all shadow-md shadow-brand-success/10 active:scale-95 text-center uppercase tracking-wider"
                >
                  Confirm Check-In
                </button>
                <button
                  onClick={resumeScanning}
                  className="w-full btn-secondary py-3 text-xs"
                >
                  Cancel / Scan Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHECK-OUT BLUE BANNER */}
        {scanStatus === 'checked_out_pending' && activeTicket && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="glass-panel p-6 rounded-2xl border-brand-info bg-brand-info/5 space-y-6 shadow-xl shadow-brand-info/5">
              <div className="text-center border-b border-brand-border/40 pb-4">
                <span className="text-4xl block mb-2">🚪</span>
                <h3 className="text-lg font-black text-brand-info tracking-widest uppercase">CHECK OUT PENDING</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Checked in at: {new Date(activeTicket.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Student Name</span>
                  <span className="text-xl font-bold text-white">{activeTicket.student_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Class</span>
                    <span className="text-md font-bold text-white">{activeTicket.class}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Roll Number</span>
                    <span className="text-md font-bold text-white">#{activeTicket.roll_no}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block tracking-wider">Ticket Number</span>
                  <span className="font-mono text-brand-accent font-bold">{activeTicket.ticket_number}</span>
                </div>
              </div>

              <div className="flex flex-col space-y-3 pt-4">
                <button
                  onClick={handleConfirmCheckOut}
                  className="w-full py-3.5 bg-brand-info hover:bg-blue-600 text-white font-extrabold rounded-xl transition-all shadow-md shadow-brand-info/10 active:scale-95 text-center uppercase tracking-wider"
                >
                  Confirm Check-Out
                </button>
                <button
                  onClick={resumeScanning}
                  className="w-full btn-secondary py-3 text-xs"
                >
                  Cancel / Scan Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ALREADY EXITED ORANGE BANNER */}
        {scanStatus === 'exited' && activeTicket && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="glass-panel p-8 rounded-2xl border-brand-warning bg-brand-warning/10 text-center space-y-6">
              <span className="text-7xl block animate-bounce">⚠️</span>
              <div>
                <h3 className="text-2xl font-black text-brand-warning tracking-wider uppercase">Already Exited</h3>
                <p className="text-md text-white font-bold mt-3">
                  {activeTicket.student_name}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Left at: {new Date(activeTicket.checked_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-brand-warning font-semibold mt-3">
                  Re-entry is strictly blocked.
                </p>
              </div>
              <div className="pt-4 border-t border-brand-border/20 text-xs text-slate-400">
                Resuming camera feed in <strong className="text-white">{resumeTimer}s</strong>...
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
