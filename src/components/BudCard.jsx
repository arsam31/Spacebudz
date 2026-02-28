import { useState } from "react";
import { SPACEBUD_IMAGE_API, CEXPLORER_TX } from "../constants.js";

function TxStatus({ state }) {
  if (!state) return null;

  switch (state.status) {
    case "building":
      return (
        <div className="tx-status building">
          <span className="spinner" /> Building transaction...
        </div>
      );
    case "signing":
      return (
        <div className="tx-status signing">
          <span className="spinner" /> Sign in your wallet...
        </div>
      );
    case "submitting":
      return (
        <div className="tx-status submitting">
          <span className="spinner" /> Submitting...
        </div>
      );
    case "success":
      return (
        <div className="tx-status success">
          ✓{" "}
          <a
            className="tx-link"
            href={`${CEXPLORER_TX}${state.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Done! View tx
          </a>
        </div>
      );
    case "error":
      return (
        <div className="tx-status error" title={state.message}>
          ✗ {state.message?.slice(0, 60)}{state.message?.length > 60 ? "…" : ""}
        </div>
      );
    case "cancelled":
      return <div className="tx-status cancelled">Transaction cancelled</div>;
    default:
      return null;
  }
}

export default function BudCard({ id, direction, onAction, disabled }) {
  const [imgError, setImgError] = useState(false);
  const [txState, setTxState] = useState(null);
  const [done, setDone] = useState(false);

  const isBusy =
    txState &&
    ["building", "signing", "submitting"].includes(txState.status);

  async function handleClick() {
    const result = await onAction(id, setTxState);
    if (result?.success) {
      setDone(true);
    }
  }

  if (done) return null; // Remove card from grid on success

  const isForward = direction === "migrate";
  const btnClass = isForward ? "btn-migrate" : "btn-burn";
  const btnLabel = isForward ? "Migrate to v2" : "Reverse to v1";

  return (
    <div className="bud-card">
      <div className="bud-image-wrap">
        {imgError ? (
          <div className="bud-placeholder">#{id}</div>
        ) : (
          <img
            className="bud-image"
            src={`${SPACEBUD_IMAGE_API}${id}`}
            alt={`SpaceBud #${id}`}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="bud-info">
        <div className="bud-name">SpaceBud #{id}</div>
        <button
          className={btnClass}
          onClick={handleClick}
          disabled={isBusy || disabled}
        >
          {isBusy ? (
            <><span className="spinner" /> Working...</>
          ) : (
            btnLabel
          )}
        </button>
        <TxStatus state={txState} />
      </div>
    </div>
  );
}
