import React from 'react'

// Position configuration for absolute overlay text positions on top of the ticket background
// Adjust these percentages or widths as needed to align with your public/ticket-background.png layout.
const POSITIONS = {
  studentName: { top: '37%', left: '64%', transform: 'translateY(-50%)' },
  class: { top: '56%', left: '64%', transform: 'translateY(-50%)' },
  rollNo: { top: '72%', left: '67%', transform: 'translateY(-50%)' },
  ticketNo: { top: '1%', left: '7%', fontSize: '1rem' },
  qrCode: { top: '62%', left: '85%', transform: 'translateY(-50%)', width: '120px', height: '130px' }
}

// Configurable text styles (color, weight, fonts)
const STYLES = {
  textColor: 'text-black', // Text color class (e.g., text-white, text-slate-900, text-indigo-200)
  studentNameStyle: 'text  tracking-wide uppercase',
  detailsStyle: 'text-lg tracking-wider',
  ticketNoStyle: 'font-mono tracking-widest '
}

export default function TicketPreview({
  ticketNumber = "EVT-XXX",
  studentName = "John Doe",
  studentClass = "10-A",
  rollNo = "42",
  qrCodeUrl = "",
  containerId = "ticket-preview-element"
}) {
  return (
    // Responsive scaling parent matching the new 850px x 275px aspect ratio (Height scaled accordingly)
    <div className="w-full flex justify-center items-center overflow-hidden h-[165px] sm:h-[192px] md:h-[220px] lg:h-[275px] bg-brand-dark/20 rounded-2xl border border-brand-border/20 py-2">
      <div className="transform scale-[0.6] sm:scale-[0.7] md:scale-[0.8] lg:scale-100 origin-center transition-all duration-200 flex-shrink-0">
        {/* 
          This is the fixed-size container captured by html2canvas. 
          We keep it exactly 850px by 275px matching 1600x517 aspect ratio.
        */}
        <div
          id={containerId}
          className="relative w-[850px] h-[275px] bg-cover bg-no-repeat bg-center rounded-2xl shadow-2xl select-none flex-shrink-0"
          style={{
            backgroundImage: `url('/ticket-background.png')`,
            fontFamily: "'Outfit', 'Inter', sans-serif"
          }}
        >
          {/* Ticket Number */}
          <div
            className={`absolute ${STYLES.textColor} ${STYLES.ticketNoStyle}`}
            style={{
              top: POSITIONS.ticketNo.top,
              left: POSITIONS.ticketNo.left,
              fontSize: POSITIONS.ticketNo.fontSize
            }}
          >
            {ticketNumber}
          </div>

          {/* Student Name */}
          <div
            className={`absolute ${STYLES.textColor} ${STYLES.studentNameStyle} max-w-[320px] truncate`}
            style={{
              top: POSITIONS.studentName.top,
              left: POSITIONS.studentName.left,
              transform: POSITIONS.studentName.transform
            }}
          >
            {studentName || "STUDENT NAME"}
          </div>

          {/* Class */}
          <div
            className={`absolute ${STYLES.textColor} ${STYLES.detailsStyle}`}
            style={{
              top: POSITIONS.class.top,
              left: POSITIONS.class.left,
              transform: POSITIONS.class.transform
            }}
          >
            {studentClass || "N/A"}
          </div>

          {/* Roll Number */}
          <div
            className={`absolute ${STYLES.textColor} ${STYLES.detailsStyle}`}
            style={{
              top: POSITIONS.rollNo.top,
              left: POSITIONS.rollNo.left,
              transform: POSITIONS.rollNo.transform
            }}
          >
            {rollNo || "N/A"}
          </div>

          {/* QR Code */}
          <div
            className="absolute bg-white p-2 rounded-lg flex items-center justify-center border border-white/20 shadow-md"
            style={{
              top: POSITIONS.qrCode.top,
              left: POSITIONS.qrCode.left,
              transform: POSITIONS.qrCode.transform,
              width: POSITIONS.qrCode.width,
              height: POSITIONS.qrCode.height
            }}
          >
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Ticket QR Code"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-mono text-center leading-none">
                QR Code Placeholder
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
