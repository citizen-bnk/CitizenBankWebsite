import { useStackApp } from "@stackframe/react";
import { Check, Copy, FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type DemoAccounts, getDemoAccounts, reasonMessage } from "utils/platform";

/**
 * Public sign-in page for the demonstration environment: lists the seven demo accounts and the shared demo
 * password, then hands over to the normal sign-in. The banking apps also send people back here.
 */
export default function DemoSignIn() {
  const app = useStackApp();
  const [data, setData] = useState<DemoAccounts | null | undefined>(undefined);
  const [copied, setCopied] = useState<string | null>(null);
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

  const signIn = () => {
    try {
      localStorage.setItem("dtbn-login-next", "/demo/launch");
    } catch {
      /* private mode: sign-in still works, it just lands on the home page */
    }
    window.location.assign(app.urls.signIn);
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
                  Try every part of the platform with a ready-made account. Banking is simulated and no real money
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
              <Button className="ml-auto" onClick={signIn} data-testid="sign-in">Sign in</Button>
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
