import { useRuntimeInfo } from "./useRuntimeInfo";

type Step = { title: string; text: string; next?: boolean };

const steps: Step[] = [
  { title: "Code", text: "A React + TypeScript app and a Dockerfile." },
  { title: "Build", text: "Cloud Build compiles it and packages a container image." },
  { title: "Deploy", text: "Cloud Run serves it over HTTPS with a new revision." },
  { title: "Automate", text: "Every git push deploys automatically. CI/CD.", next: true },
];

export default function App() {
  const { version, revision, started } = useRuntimeInfo();

  return (
    <div className="wrap">
      <nav>
        <div className="logo">
          ship<span>.</span>it
        </div>
        <div className="pill mono">
          <span className="dot" />
          live · v{version}
        </div>
      </nav>

      <header className="hero">
        <div className="eyebrow mono">// a devops journey</div>
        <h1>
          From laptop
          <br />
          to <em>the cloud</em>.
        </h1>
        <p className="lead">
          This page is a React app in a container, built by Cloud Build, stored in Artifact
          Registry and served by Cloud Run. It scales to zero when nobody's watching.
        </p>

        <div className="term">
          <div className="term-bar">
            <i />
            <i />
            <i />
          </div>
          <pre className="mono">
            <span className="p">$</span> gcloud run deploy shipit --source .{"\n"}
            Building using Dockerfile...           <span className="ok">done</span>{"\n"}
            Creating Revision...                   <span className="ok">done</span>{"\n"}
            Routing traffic...                     <span className="ok">done</span>{"\n"}
            Revision <span className="u">{revision}</span> is serving 100% of traffic.{"\n"}
            <span className="p">$</span> <span className="cursor" />
          </pre>
        </div>
      </header>

      <section>
        <h2>The pipeline</h2>
        <div className="pipeline">
          {steps.map((s) => (
            <div key={s.title} className={s.next ? "step next" : "step"}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Runtime</h2>
        <div className="stats mono">
          <Stat label="version" value={version} />
          <Stat label="revision" value={revision} />
          <Stat label="container started" value={started} />
        </div>
      </section>

      <footer>
        <span>Built while learning DevOps on Google Cloud.</span>
        <span className="mono">/health → ok</span>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <b>{label}</b>
      <span>{value}</span>
    </div>
  );
}
