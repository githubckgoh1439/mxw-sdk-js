'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw, MultiSig} from '../src.ts/index';
import { nodeProvider } from "./env";
import { bigNumberify } from '../src.ts/utils';
import { smallestUnitName } from '../src.ts/utils/units';

let indent = "     ";
let silent = false;
let silentRpc = true;
let slowThreshold = 9000;

let providerConnection: mxw.providers.Provider;
let wallet: mxw.Wallet;
let provider: mxw.Wallet;
let issuer: mxw.Wallet;
let middleware: mxw.Wallet;

let multiSigWalletProperties: MultiSig.MultiSigWalletProperties;
let updateMultiSigWalletProperties: MultiSig.UpdateMultiSigWalletProperties;

let multiSigWallet: MultiSig.MultiSigWallet;

let defaultOverrides = {
    logSignaturePayload: function (payload) {
        if (!silentRpc) console.log(indent, "signaturePayload:", JSON.stringify(payload));
    },
    logSignedTransaction: function (signedTransaction) {
        if (!silentRpc) console.log(indent, "signedTransaction:", signedTransaction);
    }
}

describe('Suite: MultiSignature Wallet', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    if (silent) { silent = nodeProvider.trace.silent; }
    if (silentRpc) { silentRpc = nodeProvider.trace.silentRpc; }

    it("Initialize", function () {
        providerConnection = new mxw.providers.JsonRpcProvider(nodeProvider.connection, nodeProvider)
            .on("rpc", function (args) {
                if (!silentRpc) {
                    if ("response" == args.action) {
                        console.log(indent, "RPC REQ:", JSON.stringify(args.request));
                        console.log(indent, "    RES:", JSON.stringify(args.response));
                    }
                }
            }).on("responseLog", function (args) {
                if (!silentRpc) {
                    console.log(indent, "RES LOG:", JSON.stringify({ info: args.info, response: args.response }));
                }
            });

        // We need to use KYCed wallet to create fungible token
        wallet = mxw.Wallet.fromMnemonic(nodeProvider.kyc.issuer).connect(providerConnection);
        expect(wallet).to.exist;
        if (!silent) console.log(indent, "Wallet:", JSON.stringify({ address: wallet.address, mnemonic: wallet.mnemonic }));

        provider = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.provider).connect(providerConnection);
        expect(provider).to.exist;
        if (!silent) console.log(indent, "Provider:", JSON.stringify({ address: provider.address, mnemonic: provider.mnemonic }));

        issuer = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.issuer).connect(providerConnection);
        expect(issuer).to.exist;
        if (!silent) console.log(indent, "Issuer:", JSON.stringify({ address: issuer.address, mnemonic: issuer.mnemonic }));

        middleware = mxw.Wallet.fromMnemonic(nodeProvider.fungibleToken.middleware).connect(providerConnection);
        expect(middleware).to.exist;
        if (!silent) console.log(indent, "Middleware:", JSON.stringify({ address: middleware.address, mnemonic: middleware.mnemonic }));

        if (!silent) console.log(indent, "Fee collector:", JSON.stringify({ address: nodeProvider.fungibleToken.feeCollector }));
    });
});



describe('Suite: MultiSig - Create ', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator

    it("Create", function () {
        let signers = [issuer.address, provider.address];

        multiSigWalletProperties = {
            owner: wallet.address,
            threshold: 2,
            signers: signers,
        };

        return MultiSig.MultiSigWallet.create(multiSigWalletProperties, wallet, defaultOverrides).then((multiSigWalletRes) => {
            expect(multiSigWalletRes).to.exist;
            multiSigWallet = multiSigWalletRes as MultiSig.MultiSigWallet;
            if (!silent) console.log(indent, "groupAddress: ", multiSigWallet.groupAddress);
        });
    });

    it("Query", function () {
        return MultiSig.MultiSigWallet.fromGroupAddress(multiSigWallet.groupAddress, wallet).then((res) => {
            console.log(indent, "Created MultiSigWallet:", JSON.stringify(res.multisigAccountState));
            multiSigWallet = res
        });
    });


    it("Multisig account Update", function () {

        let signers = [issuer.address, provider.address, wallet.address];
        updateMultiSigWalletProperties = {
            owner: wallet.address,
            groupAddress: multiSigWallet.groupAddress.toString(),
            threshold: bigNumberify(2),
            signers: signers,
        };
        return MultiSig.MultiSigWallet.update(updateMultiSigWalletProperties, wallet).then((txReceipt) => {
            expect(txReceipt).to.exist;
        });

    });

    it("Transfer to group account", function () {
        let value = mxw.utils.parseMxw("122");
        let overrides = {
            logSignaturePayload: defaultOverrides.logSignaturePayload,
            logSignedTransaction: defaultOverrides.logSignedTransaction,
            memo: "Hello Blockchain!"
        }
        return wallet.provider.getTransactionFee("bank", "bank-send", {
            from: wallet.address,
            to: multiSigWallet.groupAddress,
            value,
            memo: overrides.memo
        }).then((fee) => {
            overrides["fee"] = fee;
            return wallet.transfer(multiSigWallet.groupAddress, value, overrides).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "transfer.receipt:", JSON.stringify(receipt));
            });
        });
    });

    it("Top-up provider-account", function () {
        let value = mxw.utils.parseMxw("100");
        let overrides = {
            logSignaturePayload: defaultOverrides.logSignaturePayload,
            logSignedTransaction: defaultOverrides.logSignedTransaction,
            memo: "Hello Blockchain!"
        }
        return wallet.provider.getTransactionFee("bank", "bank-send", {
            from: wallet.address,
            to: provider.address,
            value,
            memo: overrides.memo
        }).then((fee) => {
            overrides["fee"] = fee;
            return wallet.transfer(provider.address, value, overrides).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "Top-up.receipt:", JSON.stringify(receipt));
            });
        });
    });

    it("Top-up issuer-account", function () {
        let value = mxw.utils.parseMxw("100");
        let overrides = {
            logSignaturePayload: defaultOverrides.logSignaturePayload,
            logSignedTransaction: defaultOverrides.logSignedTransaction,
            memo: "Hello Blockchain!"
        }
        return wallet.provider.getTransactionFee("bank", "bank-send", {
            from: wallet.address,
            to: issuer.address,
            value,
            memo: overrides.memo
        }).then((fee) => {
            overrides["fee"] = fee;
            return wallet.transfer(issuer.address, value, overrides).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "Top-up.receipt:", JSON.stringify(receipt));
            });
        });
    });

    it("Top-up middleware-account", function () {
        let value = mxw.utils.parseMxw("100");
        let overrides = {
            logSignaturePayload: defaultOverrides.logSignaturePayload,
            logSignedTransaction: defaultOverrides.logSignedTransaction,
            memo: "Hello Blockchain!"
        }
        return wallet.provider.getTransactionFee("bank", "bank-send", {
            from: wallet.address,
            to: middleware.address,
            value,
            memo: overrides.memo
        }).then((fee) => {
            overrides["fee"] = fee;
            return wallet.transfer(middleware.address, value, overrides).then((receipt) => {
                expect(receipt).to.exist;
                if (!silent) console.log(indent, "Top-up.receipt:", JSON.stringify(receipt));
            });
        });
    });

    it("Create Multisig Tx", function () {
        let transaction = providerConnection.getTransactionRequest("bank", "bank-send", {
            from: multiSigWallet.groupAddress,
            to: wallet.address,
            value: mxw.utils.parseMxw("1"),
            memo: "pipipapipu",
            denom: smallestUnitName
        });

        let overrides = {
            accountNumber: multiSigWallet.multisigAccountState.value.accountNumber,
            nonce: 0           
        }

        return providerConnection.getTransactionFee(undefined, undefined, { tx: transaction }).then((fee) => {
            transaction["fee"] = fee;
            return multiSigWallet.sendTransaction(transaction, issuer, overrides).then((txReceipt) => {
                expect(txReceipt).to.exist;
                if (!silent) console.log(indent, "Create-MultiSig-Tx.receipt: ", JSON.stringify(txReceipt));
            });
        });
    });

    it("Sign multiSig Transaction", function () {
        let transaction = providerConnection.getTransactionRequest("bank", "bank-send", {
            from: multiSigWallet.groupAddress,
            to: wallet.address,
            value: mxw.utils.parseMxw("1"),
            memo: "pipipapipu",
            denom: smallestUnitName
        });

        let overrides = {
            accountNumber: multiSigWallet.multisigAccountState.value.accountNumber,
            nonce: 0           
        }

        return providerConnection.getTransactionFee(undefined, undefined, { tx: transaction }).then((fee) => {
            transaction["fee"] = fee;
            return multiSigWallet.sendConfirmTransaction(0, provider, overrides).then((txReceipt) => {
              expect(txReceipt).to.exist;
                if (!silent) console.log(indent, "Sign-MultiSig-Tx.receipt: ", JSON.stringify(txReceipt));
            });
        });
    });

});


//test-OK
describe('Suite: MultiSig - Clean up', function () {
    this.slow(slowThreshold); // define the threshold for slow indicator
    if (!silent) console.log(indent, "Clean up !!!");

    it("Clean up", function () {
        providerConnection.removeAllListeners();
    });
});



