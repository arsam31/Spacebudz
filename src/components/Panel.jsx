import BudCard from "./BudCard.jsx";

export default function Panel({ version, buds, loading, onAction }) {
  const isV1 = version === "v1";
  const direction = isV1 ? "migrate" : "burn";

  return (
    <div className="panel">
      <div className={`panel-header ${isV1 ? "v1" : "v2"}`}>
        <span className={`panel-badge ${isV1 ? "v1" : "v2"}`}>
          {version.toUpperCase()}
        </span>
        <div>
          <div className="panel-title">
            {isV1 ? "Migrate to v2" : "Reverse to v1"}
          </div>
          <div className="panel-subtitle">
            {isV1
              ? "CIP-0025 → CIP-0068"
              : "CIP-0068 → CIP-0025"}
          </div>
        </div>
        {!loading && (
          <div className="panel-count">
            {buds.length} bud{buds.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div className="panel-body">
        {loading ? (
          <div className="loading-state">
            <span className="spinner pulse" />
            Loading SpaceBudz...
          </div>
        ) : buds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              {isV1 ? "🌌" : "🔮"}
            </div>
            <p>
              No {version} SpaceBudz found in this wallet
            </p>
          </div>
        ) : (
          <div className="card-grid">
            {buds.map((bud) => (
              <BudCard
                key={bud.id}
                id={bud.id}
                direction={direction}
                onAction={onAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
