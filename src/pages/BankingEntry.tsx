import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { startHandoff, type BankingAudience } from "utils/platform";

/** A signed-in website session is the only way to start a banking session. */
export default function BankingEntry({ audience }: { audience: BankingAudience }) {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setError(null);
    try {
      window.location.assign(await startHandoff(audience));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Banking sign-in is unavailable. Please retry.");
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void open();
  }, [audience]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="text-2xl font-semibold">Opening Citizen Banking</h1>
      {error ? <p role="alert">{error}</p> : <p role="status">Checking your Citizen account…</p>}
      <div className="flex flex-wrap justify-center gap-3">
        <button className="rounded-lg bg-[#6d52a2] px-5 py-3 font-semibold text-white" onClick={() => void open()}>
          {error ? "Retry" : "Open banking"}
        </button>
        <Link className="rounded-lg border px-5 py-3 font-semibold" to="/">Back to website</Link>
      </div>
    </main>
  );
}
