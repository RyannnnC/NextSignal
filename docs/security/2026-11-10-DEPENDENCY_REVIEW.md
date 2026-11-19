# Dependency and surface review

Reviewed on 2026-11-10 in the local development workspace.

## Frontend and local API

- The production font output changed from 12 files and 147,908 bytes to four WOFF2 files and 83,216 bytes. Only the Latin and Latin Extended subsets of DM Sans Variable and regular IBM Plex Mono are bundled. Chinese glyphs continue to use operating-system fonts. Removed the unused `method-panel` rules.
- The font notices match the installed Fontsource 5.3.0 licenses byte for byte. Next.js serves the notices from `public/licenses`. Include that directory with the web assets when packaging a standalone deployment. OFL 1.1 permits commercial use and embedding subject to its redistribution conditions. [DM Sans OFL](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt) · [IBM Plex Mono OFL](https://github.com/google/fonts/blob/main/ofl/ibmplexmono/OFL.txt)
- The BFF and worker share an exact method and path allowlist. The existing health, session and project operations have active callers. The tests cover unsupported methods, invalid IDs and the existing authentication boundaries. The scope is the local fixture interface.
- A TypeScript syntax-tree check found Chinese documentation for 123 named functions, methods, constructors, and named function variables in first-party code and tests. Generated files, third-party code and inline anonymous callbacks are outside this count.

## License inventory

`npm sbom --sbom-format cyclonedx` inventoried 189 installed components. `npm sbom --omit=dev --sbom-format cyclonedx` inventoried 40 production components on this Windows workspace. The lockfile-only inventory listed 272 components, including optional dependencies for other platforms. Six entries without license metadata were the private `@nextsignal` workspaces.

Review the license files for the packages actually distributed in the target release. The inventories include OFL-1.1 fonts, CC-BY-4.0 browser data (`caniuse-lite`), MPL-2.0 tooling, and platform-dependent Sharp and libvips packages with LGPL-3.0-or-later terms. Preserve applicable notices and assess distribution requirements for any native libraries included in a Linux image.

## npm vulnerability results

- `npm audit --omit=dev` exited 0 and reported zero vulnerabilities in the production dependency tree.
- `npm audit` exited 1 and reported ten moderate entries. The root advisory is CVE-2026-118764, a denial-of-service issue in `minimatch` 10.2.6 reached through ESLint and typescript-eslint. No high or critical npm findings were reported. Upstream lists 11.0.1 as the first patched version. The npm forced remediation would change the lint toolchain across major versions, so the dependency versions were left intact in this cleanup. [GitHub advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)

## Container vulnerability results

Docker Scout scanned the pinned local PostgreSQL 17 image (`linux/amd64`, digest `31ba9c94a03a`) with the severity filter set to critical and high. It reported four critical and 39 high matches across five packages. The four critical matches were in the Go standard library. The scan identifies packages and advisory matches. It does not establish that the affected paths are reachable in this local setup. The pinned development image was not changed. Review a replacement separately with the native PostgreSQL and persistence gates before switching the existing volume.
