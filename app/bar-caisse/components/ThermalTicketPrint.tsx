export function ThermalTicketPrint(props: any) {
  const { thermalPrintPayload } = props;

  return (
    <div id="thermal-ticket-print-root" aria-hidden="true">
      {thermalPrintPayload ? (
        <div className="thermal-ticket-card notranslate" translate="no">
          <div className="thermal-center thermal-title">{thermalPrintPayload.restaurantName || "Mon Restaurant"}</div>
          {String(thermalPrintPayload.restaurantAddress || "").trim() ? (
            <div className="thermal-center">{String(thermalPrintPayload.restaurantAddress || "").trim()}</div>
          ) : null}
          <div className="thermal-center">Table {thermalPrintPayload.tableNumber}</div>
          <div className="thermal-center">{new Date(thermalPrintPayload.paidAt).toLocaleString("fr-FR")}</div>
          <div className="thermal-center">Paiement : {thermalPrintPayload.paymentMethod}</div>
          <div className="thermal-sep" />
          {thermalPrintPayload.lines.map((line: any, idx: number) => {
            const qty = Math.max(1, Number(line.quantity) || 1);
            const baseUnit = Number(line.baseUnitPrice || 0);
            const suppUnit = Number(line.supplementUnitPrice || 0);
            const unitTotal = qty > 0 ? Number(line.lineTotal || 0) / qty : Number(line.lineTotal || 0);
            return (
              <div key={`thermal-line-${idx}`} className="thermal-line">
                <div className="thermal-line-top">
                  <span>{qty}x {line.itemName}</span>
                  <span>{Number(line.lineTotal || 0).toFixed(2)} EUR</span>
                </div>
                {suppUnit > 0 ? (
                  <div className="thermal-line-sub">Base {baseUnit.toFixed(2)} + Supp. {suppUnit.toFixed(2)} = {unitTotal.toFixed(2)} EUR</div>
                ) : qty > 1 ? (
                  <div className="thermal-line-sub">Prix unitaire {unitTotal.toFixed(2)} EUR</div>
                ) : null}
                {line.extras.length > 0 ? <div className="thermal-line-sub">Suppléments: {line.extras.join(", ")}</div> : null}
                {line.notes.length > 0 ? <div className="thermal-line-sub">Notes: {line.notes.join(" | ")}</div> : null}
              </div>
            );
          })}
          <div className="thermal-sep" />
          <div className="thermal-line-top thermal-total"><span>Total TTC</span><span>{Number(thermalPrintPayload.totalTtc || 0).toFixed(2)} EUR</span></div>
          {Number(thermalPrintPayload.tipAmount || 0) > 0 ? (
            <>
              <div className="thermal-line-sub">Pourboire: {Number(thermalPrintPayload.tipAmount || 0).toFixed(2)} EUR</div>
              <div className="thermal-line-top thermal-total">
                <span>Total encaissé</span>
                <span>{(Number(thermalPrintPayload.totalTtc || 0) + Number(thermalPrintPayload.tipAmount || 0)).toFixed(2)} EUR</span>
              </div>
            </>
          ) : null}
          <div className="thermal-line-sub">Total HT: {(Number(thermalPrintPayload.totalTtc || 0) / 1.1).toFixed(2)} EUR</div>
          <div className="thermal-line-sub">TVA 10%: {(Number(thermalPrintPayload.totalTtc || 0) - Number(thermalPrintPayload.totalTtc || 0) / 1.1).toFixed(2)} EUR</div>
          {String(thermalPrintPayload.feedbackUrl || "").trim() ? (
            <div className="thermal-line-sub">Avis client : {String(thermalPrintPayload.feedbackUrl || "").trim()}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
