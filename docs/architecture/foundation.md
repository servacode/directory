# Foundation Architecture

The repository is a pnpm monorepo. Applications may depend on shared packages; shared packages must not depend on applications. Product business logic is intentionally absent from Phase 0.

The target runtime is Node.js 24 LTS. React Native is pinned to 0.87, Next.js to the current Active-LTS 16.3.x line, and NestJS to v12-compatible packages. Package installation and framework builds must be executed on a network-enabled environment before Phase 0 can be formally closed.
