import {
  applyParamsToScript,
  Data,
  fromHex,
  fromText,
  MerkleTree,
  toHex,
  toLabel,
  toUnit,
} from "lucid-cardano";

import scripts from "./ghc/scripts.json";
import metadata from "./data/metadata.json";
import merkleTreeData from "./data/merkletree_data.json";
import { budConfig } from "./config.js";
import * as D from "./contract.types.js";
import { fromAddress, toAddress } from "./utils.js";
import { concat } from "./helpers.js";

const TWIN0 = 1903;
const TWIN1 = 6413;

function isTwin(id) {
  return id === TWIN0 || id === TWIN1;
}

export class Contract {
  constructor(lucid, config = budConfig) {
    this.lucid = lucid;
    this.config = config;

    this.referenceValidator = {
      type: "PlutusV2",
      script: applyParamsToScript(
        scripts.reference,
        [toLabel(1), toLabel(100), toLabel(222)],
        D.RefParams
      ),
    };

    this.referenceAddress = this.lucid.utils.validatorToAddress(
      this.referenceValidator
    );

    this.lockValidator = {
      type: "PlutusV2",
      script: applyParamsToScript(
        scripts.lock,
        [toLabel(1), toLabel(100), toLabel(222), this.config.oldPolicyId],
        D.LockParams
      ),
    };

    this.lockAddress = this.lucid.utils.validatorToAddress(this.lockValidator);

    this.extraMultisig = this.lucid.utils.nativeScriptFromJson({
      type: "atLeast",
      required: Math.ceil(this.config.extra.initialOwners.length / 2),
      scripts: this.config.extra.initialOwners.map((owner) => {
        const { paymentCredential } =
          this.lucid.utils.getAddressDetails(owner);
        if (!paymentCredential?.hash || paymentCredential.type === "Script") {
          throw new Error(
            "Owner needs to be a public key address, or address is invalid."
          );
        }
        return {
          type: "sig",
          keyHash: paymentCredential.hash,
        };
      }),
    });

    this.extraAddress = this.lucid.utils.validatorToAddress(this.extraMultisig);

    this.data = merkleTreeData.map((d) => fromHex(d));
    this.merkleTree = new MerkleTree(this.data);

    this.mintPolicy = {
      type: "PlutusV2",
      script: applyParamsToScript(
        scripts.mint,
        [
          toLabel(100),
          {
            extraOref: {
              txHash: { hash: this.config.extra.outRef.txHash },
              outputIndex: BigInt(this.config.extra.outRef.outputIndex),
            },
            royaltyName: toLabel(500) + fromText("Royalty"),
            ipName: toLabel(600) + fromText("Ip"),
            oldPolicyId: this.config.oldPolicyId,
            merkleRoot: { hash: toHex(this.merkleTree.rootHash()) },
            refAddress: this.lucid.utils.validatorToScriptHash(
              this.referenceValidator
            ),
            lockAddress: this.lucid.utils.validatorToScriptHash(
              this.lockValidator
            ),
            nonce: 23321n,
          },
        ],
        D.DetailsParams
      ),
    };

    this.mintPolicyId = this.lucid.utils.mintingPolicyToId(this.mintPolicy);
  }

  async migrate(ids) {
    const refScripts = await this.getDeployedScripts();

    const orderedIds = ids.slice().sort().reverse();

    const datas = orderedIds.map((id) => this.data[id]);
    const proofs = datas.map((d) => this.merkleTree.getProof(d));

    const action = Data.to(
      {
        Mint: [
          proofs.map((proof) =>
            proof.map((p) =>
              p.left
                ? { Left: [{ hash: toHex(p.left) }] }
                : { Right: [{ hash: toHex(p.right) }] }
            )
          ),
        ],
      },
      D.Action
    );

    const mintAssets = orderedIds.reduce(
      (prev, id) => ({
        ...prev,
        [toUnit(
          this.mintPolicyId,
          fromText(`Bud${id}`),
          isTwin(id) ? 1 : 100
        )]: 1n,
        [toUnit(this.mintPolicyId, fromText(`Bud${id}`), 222)]: 1n,
      }),
      {}
    );

    const lockAssets = orderedIds.reduce(
      (prev, id) => ({
        ...prev,
        [toUnit(this.config.oldPolicyId, fromText(`SpaceBud${id}`))]: 1n,
      }),
      {}
    );

    const tx = await this.lucid
      .newTx()
      .mintAssets(mintAssets, action)
      .compose(
        (() => {
          const tx = this.lucid.newTx();
          orderedIds.forEach((id) => {
            tx.payToContract(
              this.referenceAddress,
              Data.to(
                {
                  metadata: Data.castFrom(
                    Data.fromJson(metadata[id]),
                    D.Metadata
                  ),
                  version: 1n,
                  extra: Data.from(Data.void()),
                },
                D.DatumMetadata
              ),
              {
                [toUnit(
                  this.mintPolicyId,
                  fromText(`Bud${id}`),
                  isTwin(id) ? 1 : 100
                )]: 1n,
              }
            );
          });
          return tx;
        })()
      )
      .payToContract(
        this.lockAddress,
        {
          inline: Data.to(this.mintPolicyId, Data.Bytes()),
        },
        lockAssets
      )
      .compose(
        refScripts.mint
          ? this.lucid.newTx().readFrom([refScripts.mint])
          : this.lucid.newTx().attachSpendingValidator(this.mintPolicy)
      )
      .complete();

    const txSigned = await tx.sign().complete();
    return txSigned.submit();
  }

  async _burn(id) {
    const [refNFTUtxo] = await this.lucid.utxosAtWithUnit(
      this.referenceAddress,
      toUnit(this.mintPolicyId, fromText(`Bud${id}`), isTwin(id) ? 1 : 100)
    );

    if (!refNFTUtxo) throw new Error("NoUTxOError");

    const refScripts = await this.getDeployedScripts();

    // Find the lock UTxO that holds the v1 token
    const v1Unit = toUnit(this.config.oldPolicyId, fromText(`SpaceBud${id}`));
    const lockUtxos = await this.lucid.utxosAt(this.lockAddress);
    const lockUtxo = lockUtxos.find((u) => u.assets[v1Unit]);

    if (!lockUtxo) throw new Error("V1 token not found at lock address. Cannot safely reverse — aborting.");

    // Calculate remaining assets in the lock UTxO after removing the v1 token
    const remainingAssets = { ...lockUtxo.assets };
    delete remainingAssets[v1Unit];
    // Remove lovelace from remaining check — only care about native assets
    const { lovelace: _lv, ...remainingNonAda } = remainingAssets;
    const hasRemainingTokens = Object.keys(remainingNonAda).length > 0;

    let tx = this.lucid
      .newTx()
      // Spend from reference address — burn the reference NFT
      .collectFrom([refNFTUtxo], Data.to("Burn", D.RefAction))
      // Spend from lock address — unlock the v1 token (unit redeemer)
      .collectFrom([lockUtxo], Data.void())
      // Burn v2 reference + user NFTs
      .mintAssets(
        {
          [toUnit(
            this.mintPolicyId,
            fromText(`Bud${id}`),
            isTwin(id) ? 1 : 100
          )]: -1n,
          [toUnit(this.mintPolicyId, fromText(`Bud${id}`), 222)]: -1n,
        },
        Data.to("Burn", D.Action)
      )
      .attachSpendingValidator(this.referenceValidator)
      .attachSpendingValidator(this.lockValidator);

    // If other v1 tokens remain in this lock UTxO, send them back to the lock address
    if (hasRemainingTokens) {
      tx = tx.payToContract(
        this.lockAddress,
        { inline: lockUtxo.datum },
        remainingNonAda
      );
    }

    return tx.compose(
      refScripts.mint
        ? this.lucid.newTx().readFrom([refScripts.mint])
        : this.lucid.newTx().attachSpendingValidator(this.mintPolicy)
    );
  }

  async burn(id) {
    const tx = await (await this._burn(id)).complete();
    const signedTx = await tx.sign().complete();
    return signedTx.submit();
  }

  async hasMigrated(id) {
    const [refNFTUtxo] = await this.lucid.utxosAtWithUnit(
      this.referenceAddress,
      toUnit(this.mintPolicyId, fromText(`Bud${id}`), isTwin(id) ? 1 : 100)
    );
    if (!refNFTUtxo) return false;
    return true;
  }

  async getDeployedScripts() {
    if (!this.config.deployTxHash) return { mint: null };
    const [mint] = await this.lucid.utxosByOutRef([
      {
        txHash: this.config.deployTxHash,
        outputIndex: 0,
      },
    ]);
    return { mint };
  }
}
