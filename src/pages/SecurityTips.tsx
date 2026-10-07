import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePolicy, visibleContact } from 'utils/policy';
import { Shield, Lock, Eye, Smartphone, Mail, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function SecurityTips() {
  const policy = usePolicy();
  const reportLines = visibleContact(policy, ['security_email', 'phone']);
  const securityTips = [
    {
      icon: Lock,
      title: 'Password Security',
      tips: [
        'Use strong passwords with at least 12 characters including uppercase, lowercase, numbers, and symbols',
        'Never share your password with anyone, including staff',
        'Change your password regularly (every 3-6 months)',
        'Use different passwords for different accounts',
        'Enable two-factor authentication whenever available'
      ],
      color: '#6d52a2'
    },
    {
      icon: Smartphone,
      title: 'Mobile App Safety',
      tips: [
        'Only install apps from a source Citizen Bank has told you to use',
        'Keep your mobile banking app updated to the latest version',
        'Never save your login credentials on shared devices',
        'Use biometric authentication (fingerprint/face ID) when available',
        'Log out after each session, especially on shared devices'
      ],
      color: '#8f6ec4'
    },
    {
      icon: Mail,
      title: 'Phishing Prevention',
      tips: [
        'We will never ask for your password, PIN, or OTP via email or phone',
        'Always verify the sender\'s email address before clicking links',
        'Look for "https://" and the padlock icon in your browser',
        'Be suspicious of urgent requests for personal information',
        'Report suspicious emails to Citizen Bank using the contact details on this site'
      ],
      color: '#6d52a2'
    },
    {
      icon: Eye,
      title: 'Account Monitoring',
      tips: [
        'Check your account activity regularly for unauthorised transactions',
        'Turn on notifications for account activity where they are offered',
        'Report any suspicious activity immediately',
        'Review your account activity at least once a week',
        'Keep your contact information updated so we can reach you'
      ],
      color: '#8f6ec4'
    }
  ];

  const redFlags = [
    'Requests for your password, PIN, or OTP',
    'Emails with spelling or grammatical errors',
    'Suspicious links or attachments',
    'Threats or urgent demands for action',
    'Requests to transfer money to "secure" accounts',
    'Calls claiming to be from Citizen Bank asking for verification codes'
  ];

  const safePractices = [
    'Use online banking only from secure, private networks',
    'Keep your devices updated with the latest security patches',
    'Use antivirus software and keep it updated',
    'Never use public computers for banking',
    'Sign out and close the browser after online banking sessions'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">Security Tips</h1>
            <p className="text-xl text-white/90">
              General advice for staying safe from fraud, scams and unauthorised access
            </p>
          </div>
        </div>
      </section>

      {/* Security Tips Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {securityTips.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-[#6d52a2]/10">
                      <Icon className="h-6 w-6" style={{ color: category.color }} />
                    </div>
                    <CardTitle>{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {category.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Warning Signs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-900">Red Flags - Never Trust</CardTitle>
                  <CardDescription>Warning signs of fraud or scams</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {redFlags.map((flag, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{flag}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-green-900">Safe Practices</CardTitle>
                  <CardDescription>Additional security measures</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {safePractices.map((practice, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{practice}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contact */}
        <Alert className="border-[#6d52a2] bg-[#6d52a2]/5">
          <Shield className="h-5 w-5 text-[#6d52a2]" />
          <AlertTitle className="text-[#6d52a2] font-semibold">Suspect Fraud?</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-gray-700 mb-3">
              If you suspect unauthorized activity on your account or have fallen victim to a scam, contact the person or organisation that holds your account, and report it to the police. To tell Citizen Bank:
            </p>
            <div className="space-y-2 text-sm">
              {reportLines.length > 0 ? (
                reportLines.map((l) => (
                  <p key={l.key}><strong>{l.key === 'phone' ? 'Phone' : 'Email'}:</strong> {l.value}</p>
                ))
              ) : (
                <p>Contact details for reporting will be published on the Contact page.</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </section>

      <Footer />
    </div>
  );
}
