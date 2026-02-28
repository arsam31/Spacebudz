import { useState, useCallback } from "react";
import { Contract } from "./wormhole/index.js";
import WalletConnect from "./components/WalletConnect.jsx";
import Panel from "./components/Panel.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
import { useWallet } from "./hooks/useWallet.js";
import { isBlockfrostKeyValid } from "./utils.js";
import { BLOCKFROST_KEY } from "./constants.js";

export default function App() {
  const {
    lucid,
    address,
    walletName,
    v1Buds,
    v2Buds,
    loading,
    loadingAssets,
    error: walletError,
    connect,
    disconnect,
    refresh,
  } = useWallet();

  // Confirm dialog state
  const [confirm, setConfirm] = useState(null); // { id, direction, resolve }

  const configError = !isBlockfrostKeyValid(BLOCKFROST_KEY);

  /**
   * Show confirm dialog and wait for user response.
   * Returns true if confirmed, false if cancelled.
   */
  function askConfirm(id, direction) {
    return new Promise((resolve) => {
      setConfirm({ id, direction, resolve });
    });
  }

  function handleConfirm() {
    confirm?.resolve(true);
    setConfirm(null);
  }

  function handleCancel() {
    confirm?.resolve(false);
    setConfirm(null);
  }

  /**
   * Handle migrate action (v1 → v2).
   * Called from BudCard with (id, setTxState).
   * Returns { success: true, txHash } or { success: false }.
   */
  const handleMigrate = useCallback(
    async (id, setTxState) => {
      const confirmed = await askConfirm(id, "migrate");
      if (!confirmed) {
        setTxState({ status: "cancelled" });
        return { success: false };
      }

      try {
        setTxState({ status: "building" });
        const contract = new Contract(lucid);
        // migrate() builds, signs via wallet, and submits internally
        const txHash = await contract.migrate([id]);
        setTxState({ status: "success", txHash });
        setTimeout(() => refresh(), 4000);
        return { success: true, txHash };
      } catch (e) {
        const msg = String(e?.message || e);
        if (
          msg.toLowerCase().includes("user declined") ||
          msg.toLowerCase().includes("cancelled") ||
          msg.toLowerCase().includes("rejected") ||
          msg.toLowerCase().includes("abort")
        ) {
          setTxState({ status: "cancelled" });
        } else {
          setTxState({ status: "error", message: msg });
        }
        return { success: false };
      }
    },
    [lucid, refresh]
  );

  /**
   * Handle burn action (v2 → v1).
   * Called from BudCard with (id, setTxState).
   */
  const handleBurn = useCallback(
    async (id, setTxState) => {
      const confirmed = await askConfirm(id, "burn");
      if (!confirmed) {
        setTxState({ status: "cancelled" });
        return { success: false };
      }

      try {
        setTxState({ status: "building" });
        const contract = new Contract(lucid);
        // burn() builds, signs via wallet, and submits internally
        const txHash = await contract.burn(id);
        setTxState({ status: "success", txHash });
        setTimeout(() => refresh(), 4000);
        return { success: true, txHash };
      } catch (e) {
        const msg = String(e?.message || e);
        if (
          msg.toLowerCase().includes("user declined") ||
          msg.toLowerCase().includes("cancelled") ||
          msg.toLowerCase().includes("rejected") ||
          msg.toLowerCase().includes("abort")
        ) {
          setTxState({ status: "cancelled" });
        } else {
          setTxState({ status: "error", message: msg });
        }
        return { success: false };
      }
    },
    [lucid, refresh]
  );

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">🌀</div>
          <span className="logo-text">SpaceBudz Wormhole</span>
        </div>
        <WalletConnect
          address={address}
          walletName={walletName}
          loading={loading}
          error={walletError}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      </header>

      {/* Main content */}
      <main className="main">
        {/* Config error */}
        {configError && (
          <div className="config-error">
            ⚠ Blockfrost API key not configured. Edit{" "}
            <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 4 }}>
              src/constants.js
            </code>{" "}
            and set your <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 4 }}>BLOCKFROST_KEY</code>.
          </div>
        )}

        {/* Not connected */}
        {!address ? (
          <div className="connect-prompt">
            <div className="wormhole-visual">🌀</div>
            <h2>SpaceBudz Wormhole Migration</h2>
            <p>
              Connect your Cardano wallet to migrate SpaceBudz between v1
              (CIP-0025) and v2 (CIP-0068) using the official Wormhole
              contract.
            </p>
            <button
              className="btn btn-primary"
              style={{ padding: "10px 24px", fontSize: 15 }}
              onClick={() => {
                // Trigger the wallet dropdown via the header button
                document.querySelector(".wallet-area .btn-primary")?.click();
              }}
            >
              Connect Wallet
            </button>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              Supports Eternl
            </p>
          </div>
        ) : (
          <div className="panels">
            <Panel
              version="v1"
              buds={v1Buds}
              loading={loadingAssets}
              onAction={handleMigrate}
            />
            <Panel
              version="v2"
              buds={v2Buds}
              loading={loadingAssets}
              onAction={handleBurn}
            />
          </div>
        )}
      </main>

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmModal
          id={confirm.id}
          direction={confirm.direction}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
