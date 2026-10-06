import { useStackApp } from "@stackframe/react";
import { Check, Copy, FlaskConical, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MANUAL_PARAM, afterSignInTarget, opensLabels } from "utils/demoSignIn";
import { type DemoAccount, type DemoAccounts, getDemoAccounts, reasonMessage } from "utils/platform";

/**
 * Sign-in page for the demonstration environment. Pick an account and you are signed in with no typing, then taken where you
 * were heading (the Citizen Hub, banking) or to the launcher. Because every demo account shares one published password this
 * is only offered when the demo accounts endpoint answers; anywhere else the page says it is unavailable and the normal
 * sign-in form is used. The banking apps also send people back here.
 */
export default function DemoSignIn() {
  const app = useStackApp();
  const [data, setData] = useState<DemoAccounts | null | undefined>(undefined);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reason = reasonMessage(new URLSearchParams(window.location.search).get("reason"));

  useEffect(() => {
    getDemoAccounts().then(setData);
  }, []);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard unavailable: the value is on screen to copy by hand */
    }
  };

  const signInAs = async (account: DemoAccount) => {
    if (!data?.password || busy) return;
    setBusy(account.key);
    setError(null);
    try {
      const result = await app.signInWithCredential({ email: account.email, password: data.password, noRedirect: true });
      if (result.status === "error") throw new Error(result.error?.message || "Sign-in failed");
      const next = afterSignInTarget(new URLSearchParams(window.location.search).get("after_auth_return_to"), window.location.origin);
      window.location.assign(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Check that the demo accounts exist in the Stack project.");
      setBusy(null);
    }
  };

  const manualSignIn = () => {
    const params = new URLSearchParams(window.location.search);
    params.set(MANUAL_PARAM, "1");
    window.location.assign(`${app.urls.signIn}?${params.toString()}`);
  };

  if (data === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }
  if (data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Demonstration only</CardTitle>
            <CardDescription>This page is only available in the Citizen Bank demonstration environment.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link to="/">Go to the home page</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto w-full max-w-4xl space-y-4 pt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FlaskConical className="h-6 w-6 text-amber-600" />
              <div>
                <CardTitle className="text-2xl">Citizen Bank demonstration</CardTitle>
                <CardDescription>
                  Pick an account to be signed in at once and try every part of the platform it opens. Banking is simulated and no real money
                  moves. Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking
                  licence and does not currently carry on banking business.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {reason && (
              <Alert data-testid="reason"><AlertDescription>{reason}</AlertDescription></Alert>
            )}
            {error && <Alert variant="destructive" data-testid="sign-in-error"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 dark:bg-slate-900">
              <span className="text-sm font-medium">Password for every account:</span>
              {data.password ? (
                <>
                  <code data-testid="password" className="rounded bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800">
                    {data.password}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copy("password", data.password!)}>
                    {copied === "password" ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                    {copied === "password" ? "Copied" : "Copy"}
                  </Button>
                </>
              ) : (
                <span className="text-sm text-slate-600">Ask the demonstration administrator.</span>
              )}
              <Button className="ml-auto" variant="outline" onClick={manualSignIn} data-testid="sign-in">
                Use another account
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2" data-testid="accounts">
          {data.accounts.map((a) => (
            <Card key={a.key} data-testid={`account-${a.key}`}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize">{a.key}</span>
                  <Button size="sm" variant="ghost" onClick={() => copy(a.key, a.email)} aria-label={`Copy ${a.email}`}>
                    {copied === a.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <code className="block break-all text-xs text-slate-700 dark:text-slate-300">{a.email}</code>
                <p className="text-sm text-slate-600 dark:text-slate-400">{a.description}</p>
                <div className="flex flex-wrap gap-1">
                  {a.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                </div>
                <p className="text-xs text-slate-500" data-testid={`opens-${a.key}`}>
                  Opens: {opensLabels(a).join(", ") || "nothing"}
                </p>
                <Button className="w-full" disabled={!data.password || busy !== null} onClick={() => signInAs(a)} data-testid={`login-${a.key}`}>
                  <LogIn className="mr-1 h-4 w-4" />
                  {busy === a.key ? "Signing in…" : `Sign in as ${a.key}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
