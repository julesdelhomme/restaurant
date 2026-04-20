export function KitchenPrintStyles() {
  return (
    <style>{`
      @media print {
        @page {
          size: 80mm auto;
          margin: 0 !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm !important;
          background: #fff !important;
        }
        body * { visibility: hidden !important; }
        #ticket-print, #ticket-print * { visibility: visible !important; }
        #ticket-print {
          position: fixed;
          top: 0;
          left: 0;
          width: 80mm;
          margin: 0;
          padding: 3mm;
          font-family: "Courier New", Courier, monospace;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `}</style>
  );
}

