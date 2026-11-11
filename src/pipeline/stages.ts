export type Stage = {
  id: string;
  title: string;
  where: string;
  summary: string;
  /** What happens, step by step. */
  details: string[];
  /** The real command or config behind this stage. */
  code: string;
  /** Typical real-world duration, shown in the simulation. */
  duration: string;
  /** How long the stage runs in the simulation (longer real stages run longer here too). */
  simMs: number;
};

export const stages: Stage[] = [
  {
    id: "commit",
    title: "Commit",
    where: "laptop",
    summary: "Code is written on a branch and committed with a Conventional Commit message.",
    details: [
      "husky runs a commit-msg hook on every commit",
      "commitlint rejects messages that are not feat:, fix:, chore:…",
      "the message later decides the next version number",
    ],
    code: 'git commit -m "feat: preview deployments"',
    duration: "1s",
    simMs: 1200,
  },
  {
    id: "ci",
    title: "CI",
    where: "GitHub Actions",
    summary: "Every pull request is linted, type-checked, tested and built.",
    details: [
      "ESLint, tsc --noEmit, Vitest (75% coverage minimum), vite build",
      "infrastructure PRs also get a Terraform plan posted as a comment",
      "Dependabot opens weekly update PRs that go through the same checks",
    ],
    code: "pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build",
    duration: "30s",
    simMs: 2400,
  },
  {
    id: "preview",
    title: "Preview",
    where: "Cloud Run tag",
    summary: "The pull request gets its own live URL, with zero production traffic.",
    details: [
      "a new revision is deployed with --no-traffic and a pr-<number> tag",
      "the URL is smoke-tested and posted as a PR comment",
      "the page shows a preview badge; closing the PR removes the tag",
    ],
    code: "gcloud run deploy shipit --source . --no-traffic --tag pr-16",
    duration: "1m20s",
    simMs: 3000,
  },
  {
    id: "release",
    title: "Release",
    where: "GitHub",
    summary: "After merge, a release PR bumps the version and the changelog, then a tag is pushed.",
    details: [
      "nexus:release prepare opens release/x.y.z",
      "merging it updates package.json and CHANGELOG.md",
      "nexus:release finish pushes the vX.Y.Z tag and publishes a GitHub Release",
    ],
    code: 'git tag -a v2.4.0 -m "Release v2.4.0" && git push origin v2.4.0',
    duration: "5s",
    simMs: 1400,
  },
  {
    id: "build",
    title: "Build",
    where: "Cloud Build",
    summary: "The tag triggers the deploy workflow; Cloud Build turns the source into a container.",
    details: [
      "the tag must match the version in package.json",
      "GitHub signs in to Google with Workload Identity (no keys)",
      "multi-stage Dockerfile; the image is stored in Artifact Registry",
    ],
    code: "gcloud run deploy shipit --source . --region northamerica-northeast1",
    duration: "1m",
    simMs: 3200,
  },
  {
    id: "deploy",
    title: "Deploy",
    where: "Cloud Run",
    summary: "A new revision starts with the runtime settings from the workflow, then takes 100% of traffic.",
    details: [
      "runs as shipit-runtime, a least-privilege identity",
      "max 3 instances, 256 MiB, liveness probe on /health",
      "the previous revision stays available for rollbacks",
    ],
    code: "gcloud run services update-traffic shipit --to-latest",
    duration: "20s",
    simMs: 2000,
  },
  {
    id: "live",
    title: "Live",
    where: "monitored",
    summary: "A smoke test checks the new revision, then monitoring takes over.",
    details: [
      "curl /health and /api/info must answer",
      "uptime check every 5 min from 3 regions; alerts for downtime, 5xx and latency",
      "dashboard, uptime check and alerts are managed with Terraform",
    ],
    code: "curl -fsS $URL/health && curl -fsS $URL/api/info",
    duration: "2s",
    simMs: 1400,
  },
];
