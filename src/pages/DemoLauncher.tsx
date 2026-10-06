import { useStackApp } from "@stackframe/react";
import { Building2, Landmark, LogOut, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type BankingAudience, type Me, type ServiceInfo, getMe, getServices, hubDestinations, startHandoff,
} from "utils/platform";

const BANKING: { id: BankingAudience; label: string; icon: typeof Landmark; next: string; blurb: string }[] = [
  { id: "banking", label: "Internet Banking", icon: Landmark, next: "/dashboard", blurb: "Banking on a desktop computer" },
  { id: "app", label: "Citizen Bank App", icon: Smartphone, next: "/", blurb: "Banking on a phone or tablet" },
];

/** After sign-in: shows who you are and opens the workspaces your roles allow, including banking in one click. */
export default function DemoLauncher() {
  const app = useStackApp();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<BankingAudience | null>(null);

  useEffect(() => {
    Promise.all([getMe(), getServices()])
      .then(([m, s]) => {
        setMe(m);
        setServices(s);
      })
      .catch((e: Error) => setError(e.message || "Could not load your account."));
  }, []);

  const openBanking = async (id: BankingAudience, next: string) => {
    setBusy(id);
    setError(null);
    try {
      window.location.assign(await startHandoff(id, next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open banking.");
      setBusy(null);
    }
  };

  const destinations = me ? hubDestinations(me.roles) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto w-full max-w-3xl space-y-4 pt-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Welcome{me?.display_name ? `, ${me.display_name}` : ""}</CardTitle>
                <CardDescription data-testid="email">{me?.email ?? "Loading your account…"}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.assign(app.urls.signOut)}>
                <LogOut className="mr-1 h-4 w-4" /> Sign out
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1" data-testid="roles">
            {me?.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
          </CardContent>
        </Card>

        {error && <Alert variant="destructive" data-testid="error"><AlertDescription>{error}</AlertDescription></Alert>}

        {me && (
          <>
            <section className="space-y-2" aria-labelledby="hub-heading">
              <h2 id="hub-heading" className="text-lg font-semibold">Citizen Hub</h2>
              {destinations.length === 0 ? (
                <p className="text-sm text-slate-600" data-testid="no-hub">
                  This account has no Citizen Hub workspace. It is a banking customer account.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {destinations.map((d) => (
                    <Card key={d.path} data-testid={`hub-${d.path}`}>
                      <CardContent className="space-y-2 pt-4">
                        <div className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" />{d.label}</div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{d.description}</p>
                        <Button size="sm" onClick={() => navigate(d.path)}>Open</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2" aria-labelledby="bank-heading">
              <h2 id="bank-heading" className="text-lg font-semibold">Banking (simulated)</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {BANKING.map(({ id, label, icon: Icon, next, blurb }) => {
                  const svc = services.find((s) => s.id === id);
                  const ok = !!svc?.eligible;
                  return (
                    <Card key={id} data-testid={`bank-${id}`} className={ok ? "" : "opacity-70"}>
                      <CardContent className="space-y-2 pt-4">
                        <div className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4" />{label}</div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{ok ? blurb : svc?.reason ?? "Not available"}</p>
                        <Button size="sm" disabled={!ok || busy !== null} onClick={() => openBanking(id, next)}>
                          {busy === id ? "Opening…" : "Open"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
