import { useState, useCallback } from "react";
import { Lucid, Blockfrost } from "lucid-cardano";
import { BLOCKFROST_KEY, BLOCKFROST_URL } from "../constants.js";
import { parseV1Assets, parseV2Assets } from "../utils.js";

export function useWallet() {
  const [walletApi, setWalletApi] = useState(null);
  const [lucid, setLucid] = useState(null);
  const [address, setAddress] = useState("");
  const [walletName, setWalletName] = useState("");
  const [v1Buds, setV1Buds] = useState([]);
  const [v2Buds, setV2Buds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [error, setError] = useState("");

  const loadAssets = useCallback(async (lucidInstance) => {
    setLoadingAssets(true);
    try {
      const utxos = await lucidInstance.wallet.getUtxos();
      // Normalize utxo assets: lucid returns assets as { [unit]: bigint }
      const normalized = utxos.map((u) => ({
        ...u,
        assets: Object.fromEntries(
          Object.entries(u.assets).map(([k, v]) => [k, String(v)])
        ),
      }));
      setV1Buds(parseV1Assets(normalized));
      setV2Buds(parseV2Assets(normalized));
    } catch (e) {
      console.error("Failed to load assets:", e);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const connect = useCallback(
    async (walletId) => {
      setError("");
      setLoading(true);
      try {
        const walletExtension = window.cardano?.[walletId];
        if (!walletExtension) {
          throw new Error(
            `${walletId === "eternl" ? "Eternl" : "Nami"} wallet not found. Please install the extension.`
          );
        }

        const api = await walletExtension.enable();

        const lucidInstance = await Lucid.new(
          new Blockfrost(BLOCKFROST_URL, BLOCKFROST_KEY),
          "Mainnet"
        );
        lucidInstance.selectWallet(api);

        const addr = await lucidInstance.wallet.address();
        setWalletApi(api);
        setLucid(lucidInstance);
        setAddress(addr);
        setWalletName(walletId);

        await loadAssets(lucidInstance);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [loadAssets]
  );

  const disconnect = useCallback(() => {
    setWalletApi(null);
    setLucid(null);
    setAddress("");
    setWalletName("");
    setV1Buds([]);
    setV2Buds([]);
    setError("");
  }, []);

  const refresh = useCallback(() => {
    if (lucid) loadAssets(lucid);
  }, [lucid, loadAssets]);

  return {
    lucid,
    walletApi,
    address,
    walletName,
    v1Buds,
    v2Buds,
    loading,
    loadingAssets,
    error,
    connect,
    disconnect,
    refresh,
    setV1Buds,
    setV2Buds,
  };
}
