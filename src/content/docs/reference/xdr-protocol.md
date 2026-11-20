---
title: XDR Protocol
description: Encoding boundaries and source definitions for the Project Thruput protocol.
---

## Encodings

| Surface | Encoding | Reference |
| --- | --- | --- |
| `Transaction`, `SignedTransaction`, contract spec sidecars | Classic XDR | Protocol definitions below |
| Contract arguments, return values, exceptions, typed storage, event payloads | CXS, the compact encoding used by the SDK | [Contract Spec](/reference/contract-spec/), [TypeScript Bindings](/typescript/bindings/) |
| Transaction signing preimage | CXS domain separator, raw network hash, then classic XDR transaction | [Authorization](/contracts/authorization/) |
| Public JSON-RPC requests and responses | JSON, with base58 identifiers, `0x` hex byte fields, and decimal strings for large integers | [JSON-RPC API](/reference/json-rpc-api/) |

The Rust traits retain the names `ReadXDR` and `WriteXDR` for both encodings. Use generated SDK clients and TypeScript bindings for contract payloads; a classic XDR encoder produces different bytes.

## Source Definitions

| Source baseline | Value |
| --- | --- |
| Rust protocol package | `thruput-xdr` `0.67.0` |
| Embedded protocol revision | `hogp/a28763804e9b136` |

| Definition | Types |
| --- | --- |
| [transaction.x](https://github.com/thruputchain/thruput-protocol/blob/a28763804e9b136891ce6fcfd022e835d7c0cab2/transaction.x) | `Invocation`, `Transaction`, `SignedTransaction`, invocation outputs |
| [types.x](https://github.com/thruputchain/thruput-protocol/blob/a28763804e9b136891ce6fcfd022e835d7c0cab2/types.x) | Addresses, hashes, signatures, protocol scalar types |
| [storage_item.x](https://github.com/thruputchain/thruput-protocol/blob/a28763804e9b136891ce6fcfd022e835d7c0cab2/storage_item.x) | Storage items and deltas |
| [header.x](https://github.com/thruputchain/thruput-protocol/blob/a28763804e9b136891ce6fcfd022e835d7c0cab2/header.x) | Proposal header |
| [consensus.x](https://github.com/thruputchain/thruput-protocol/blob/a28763804e9b136891ce6fcfd022e835d7c0cab2/consensus.x) | Consensus values |
| [contract_spec.x](https://github.com/thruputchain/thruput-protocol/blob/a28763804e9b136891ce6fcfd022e835d7c0cab2/contract_spec.x) | Contract types, methods, events, and interface metadata |
