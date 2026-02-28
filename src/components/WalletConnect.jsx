import { useState, useRef, useEffect } from "react";
import { WALLETS } from "../constants.js";
import { truncateAddress } from "../utils.js";

export default function WalletConnect({ address, walletName, loading, error, onConnect, onDisconnect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (address) {
    return (
      <div className="wallet-area" ref={ref}>
        <button
          className="btn btn-outline"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="address-dot" />
          {truncateAddress(address)}
          <span style={{ marginLeft: 2, opacity: 0.6 }}>▾</span>
        </button>
        {open && (
          <div className="wallet-dropdown">
            <div className="wallet-address">
              <span className="address-dot" />
              <span style={{ wordBreak: "break-all", fontSize: 11 }}>
                {truncateAddress(address)}
              </span>
            </div>
            <div className="wallet-separator" />
            <button
              className="wallet-option"
              onClick={() => { onDisconnect(); setOpen(false); }}
            >
              <span className="wallet-option-icon">🔌</span>
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wallet-area" ref={ref}>
      <button
        className="btn btn-primary"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
      >
        {loading ? (
          <><span className="spinner" /> Connecting...</>
        ) : (
          "Connect Wallet"
        )}
      </button>
      {open && (
        <div className="wallet-dropdown">
          <div style={{ padding: "6px 12px 8px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Select Wallet
          </div>
          {WALLETS.map((w) => {
            const available = !!window.cardano?.[w.id];
            return (
              <button
                key={w.id}
                className="wallet-option"
                onClick={() => { onConnect(w.id); setOpen(false); }}
                style={!available ? { opacity: 0.5 } : {}}
              >
                <span className="wallet-option-icon">{w.icon}</span>
                {w.name}
                {!available && (
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
                    Not installed
                  </span>
                )}
              </button>
            );
          })}
          {error && (
            <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--accent-red)", borderTop: "1px solid var(--border-subtle)", marginTop: 4 }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
