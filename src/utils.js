import { V1_POLICY_ID, V2_POLICY_ID, CIP68_USER_LABEL } from "./constants.js";

/**
 * Parse v1 assets from UTxO list.
 * V1 asset name = hex("SpaceBud" + id)  (CIP-0025 style)
 */
export function parseV1Assets(utxos) {
  const budMap = new Map();
  for (const utxo of utxos) {
    for (const [unit, quantity] of Object.entries(utxo.assets)) {
      if (!unit.startsWith(V1_POLICY_ID)) continue;
      const assetNameHex = unit.slice(V1_POLICY_ID.length);
      const assetName = hexToUtf8(assetNameHex);
      const match = assetName.match(/^SpaceBud(\d+)$/);
      if (match) {
        budMap.set(Number(match[1]), { id: Number(match[1]), unit });
      }
    }
  }
  return Array.from(budMap.values()).sort((a, b) => a.id - b.id);
}

/**
 * Parse v2 assets from UTxO list.
 * V2 user NFT asset name = 000de140 + hex("Bud" + id)  (CIP-0068 label 222)
 * Note: v2 uses "Bud{id}" not "SpaceBud{id}"
 */
export function parseV2Assets(utxos) {
  const budMap = new Map();
  for (const utxo of utxos) {
    for (const [unit, quantity] of Object.entries(utxo.assets)) {
      if (!unit.startsWith(V2_POLICY_ID)) continue;
      const assetNameHex = unit.slice(V2_POLICY_ID.length);
      if (!assetNameHex.startsWith(CIP68_USER_LABEL)) continue;
      const nameHex = assetNameHex.slice(CIP68_USER_LABEL.length);
      const assetName = hexToUtf8(nameHex);
      const match = assetName.match(/^Bud(\d+)$/);
      if (match) {
        budMap.set(Number(match[1]), { id: Number(match[1]), unit });
      }
    }
  }
  return Array.from(budMap.values()).sort((a, b) => a.id - b.id);
}

function hexToUtf8(hex) {
  try {
    const bytes = new Uint8Array(
      hex.match(/.{1,2}/g).map((b) => parseInt(b, 16))
    );
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export function truncateAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export function isBlockfrostKeyValid(key) {
  return key && key !== "mainnetXXXXXX" && key.startsWith("mainnet");
}
