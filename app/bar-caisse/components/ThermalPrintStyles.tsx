export function ThermalPrintStyles() {
  return (
    <style jsx global>{`
      #thermal-ticket-print-root {
        display: none;
      }
      @media print {
        @page {
          size: 80mm auto;
          margin: 0;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm !important;
          background: #fff !important;
        }
        body * {
          visibility: hidden !important;
        }
        #thermal-ticket-print-root,
        #thermal-ticket-print-root * {
          visibility: visible !important;
        }
        #thermal-ticket-print-root {
          display: block !important;
          position: fixed;
          inset: 0 auto auto 0;
          width: 80mm;
          background: #fff;
          padding: 0;
          margin: 0;
          z-index: 999999;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #thermal-ticket-print-root .thermal-ticket-card {
          width: 80mm;
          padding: 4mm 3mm;
          color: #000;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 11px;
          line-height: 1.25;
        }
        #thermal-ticket-print-root .thermal-center {
          text-align: center;
        }
        #thermal-ticket-print-root .thermal-title {
          font-weight: 700;
          font-size: 13px;
        }
        #thermal-ticket-print-root .thermal-sep {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        #thermal-ticket-print-root .thermal-line {
          margin-bottom: 4px;
        }
        #thermal-ticket-print-root .thermal-line-top {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-weight: 700;
        }
        #thermal-ticket-print-root .thermal-line-sub {
          font-size: 10px;
          white-space: normal;
          margin-top: 1px;
        }
        #thermal-ticket-print-root .thermal-total {
          font-size: 12px;
        }
      }
    `}</style>
  );
}
