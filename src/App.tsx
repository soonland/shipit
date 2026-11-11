import { useRuntimeInfo } from "./useRuntimeInfo";
import Terminal from "./terminal/Terminal";
import Pipeline from "./pipeline/Pipeline";

export default function App() {
  const { version, revision, started, preview } = useRuntimeInfo();

  return (
    <div className="wrap">
      <nav>
        <div className="logo">
          ship<span>.</span>it
        </div>
        {preview ? (
          <div className="pill pill-preview mono" title="This is a preview of a pull request, not production">
            <span className="dot" />
            preview · PR #{preview}
          </div>
        ) : (
          <div className="pill mono">
            <span className="dot" />
            live · v{version}
          </div>
        )}
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

        <Terminal />
      </header>

      <section>
        <h2>The pipeline</h2>
        <Pipeline version={version} revision={revision} />
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
