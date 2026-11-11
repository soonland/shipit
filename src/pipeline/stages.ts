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
    summary: "Code is written and committed with a Conventional Commit message.",
    details: [
      "husky runs a commit-msg hook on every commit",
      "commitlint rejects messages that are not feat:, fix:, chore:…",
      "the message later decides the next version number",
    ],
    code: 'git commit -m "feat: interactive pipeline"',
    duration: "1s",
    simMs: 1200,
  },
  {
    id: "ci",
    title: "CI",
    where: "GitHub Actions",
    summary: "Every pull request is linted, type-checked, tested and built.",
    details: [
      "pnpm install --frozen-lockfile",
      "ESLint, then tsc --noEmit",
      "Vitest with a 75% coverage threshold",
      "vite build, so a broken bundle never merges",
    ],
    code: "pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build",
    duration: "30s",
    simMs: 2600,
  },
  {
    id: "release",
    title: "Release",
    where: "GitHub",
    summary: "A release PR bumps the version and the changelog, then a tag is pushed.",
    details: [
      "nexus:release prepare opens release/x.y.z",
      "merging it updates package.json and CHANGELOG.md",
      "nexus:release finish pushes the vX.Y.Z tag",
    ],
    code: "git tag -a v2.1.0 -m \"Release v2.1.0\" && git push origin v2.1.0",
    duration: "5s",
    simMs: 1500,
  },
  {
    id: "build",
    title: "Build",
    where: "Cloud Build",
    summary: "The tag triggers the deploy workflow; Cloud Build turns the source into a container.",
    details: [
      "GitHub signs in to Google with Workload Identity (no keys)",
      "multi-stage Dockerfile: build the React app, keep only the server",
      "the image is stored in Artifact Registry",
    ],
    code: "gcloud run deploy shipit --source . --region northamerica-northeast1",
    duration: "1m",
    simMs: 3600,
  },
  {
    id: "deploy",
    title: "Deploy",
    where: "Cloud Run",
    summary: "Cloud Run starts a new revision and moves 100% of traffic to it.",
    details: [
      "the old revision stays available for rollbacks",
      "the URL never changes",
      "instances scale to zero when nobody is watching",
    ],
    code: "gcloud run services update-traffic shipit --to-latest",
    duration: "20s",
    simMs: 2200,
  },
  {
    id: "live",
    title: "Live",
    where: "the internet",
    summary: "A smoke test checks the health endpoint, then you are reading this page.",
    details: [
      "curl /health must answer ok",
      "curl /api/info reports the new version",
      "the terminal above tails the running instance",
    ],
    code: "curl -fsS $URL/health && curl -fsS $URL/api/info",
    duration: "2s",
    simMs: 1400,
  },
];
