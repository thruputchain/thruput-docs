---
title: Generate TypeScript bindings
description: Generate typed application bindings from a built contract's canonical specification.
---

Generate bindings from the same contract build you deploy. Bindings provide method descriptors, argument types, result decoders, and declared event and error types.

## Generate during a build

```bash
groundhog build --bindings ts
```

The build prints the generated binding path alongside the contract artifacts. Use `-p PACKAGE` when selecting a workspace member.

## Write bindings into an application

Build first, then select the binary spec sidecar:

```bash
groundhog build
mkdir -p web/src/contracts
groundhog codegen ts target/groundhog/my_counter.spec.xdr \
  --output web/src/contracts/my-counter.ts
```

Replace `my_counter` with your artifact's name and the output directory with your application's location. `codegen ts` accepts `.spec.xdr`, not the readable `.spec.json` or the deployable `.rv32a` file.

## Keep code and deployment aligned

Regenerate bindings when the contract interface changes. Use the address from the matching deployment rather than an address copied from another example.

Keep generated files out of manual edits. Put application wrappers next to them so regeneration does not overwrite application logic.

Continue with [TypeScript Bindings](/tools/typescript-bindings/) for using descriptors, typed views, invocations, and event decoders.
