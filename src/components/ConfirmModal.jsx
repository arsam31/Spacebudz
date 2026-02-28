export default function ConfirmModal({ id, direction, onConfirm, onCancel }) {
  const isForward = direction === "migrate";

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {isForward ? "⬆ Migrate to v2" : "⬇ Reverse to v1"}
        </h3>
        <p>
          {isForward
            ? `This will migrate SpaceBud #${id} to v2 (CIP-0068). Your v1 token will be locked in the Wormhole contract and you'll receive the new v2 token.`
            : `This will burn your v2 SpaceBud #${id} and return the original v1 token to your wallet.`}
          <br /><br />
          <strong style={{ color: "var(--text-primary)" }}>Continue?</strong>
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
          >
            {isForward ? "Migrate" : "Reverse"}
          </button>
        </div>
      </div>
    </div>
  );
}
