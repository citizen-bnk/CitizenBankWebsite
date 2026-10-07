import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin } from 'lucide-react';
import { usePolicy, visibleContact, type ContactKey } from 'utils/policy';

const SECTIONS: { title: string; icon: typeof Mail; keys: ContactKey[] }[] = [
  { title: 'Email', icon: Mail, keys: ['email', 'support_email'] },
  { title: 'Phone', icon: Phone, keys: ['phone'] },
  { title: 'Address', icon: MapPin, keys: ['address'] },
];

export default function Contact() {
  const policy = usePolicy();
  const sections = SECTIONS.map((s) => ({ ...s, lines: visibleContact(policy, s.keys) })).filter((s) => s.lines.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl text-white/90">How to reach {policy.brand.name}</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto space-y-6">
          {sections.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-gray-600 text-sm">
                Public contact details have not been published yet. If a Citizen Bank representative invited you,
                please reply to their message.
              </CardContent>
            </Card>
          )}
          {sections.map(({ title, icon: Icon, lines }) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#6d52a2]/10">
                    <Icon className="h-5 w-5 text-[#6d52a2]" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {lines.map((l) => (
                  <p key={l.key} className="text-sm text-gray-600">{l.value}</p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
