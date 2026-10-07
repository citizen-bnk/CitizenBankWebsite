import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Lock, Mail, ArrowRight } from 'lucide-react';

const resources = [
  { icon: HelpCircle, title: 'FAQs', description: 'Answers to common questions about the platform and the licence application', to: '/faqs' },
  { icon: Lock, title: 'Security Tips', description: 'General advice for staying safe from fraud and scams', to: '/security-tips' },
  { icon: Mail, title: 'Contact', description: 'How to reach Citizen Bank', to: '/contact' },
];

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Help Center</h1>
            <p className="text-lg sm:text-xl text-white/90">Where to find help</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <p className="text-gray-600 text-center max-w-2xl mx-auto mb-10">
          There are no separate help articles yet. These pages are the best place to start.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {resources.map(({ icon: Icon, title, description, to }) => (
            <Link key={title} to={to}>
              <Card className="h-full hover:shadow-lg hover:border-[#6d52a2] transition-all group">
                <CardHeader>
                  <div className="p-3 rounded-lg bg-[#6d52a2]/10 w-fit mb-2">
                    <Icon className="h-6 w-6 text-[#6d52a2]" />
                  </div>
                  <CardTitle className="group-hover:text-[#6d52a2] transition-colors">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-[#6d52a2] font-medium inline-flex items-center gap-1 text-sm">
                    Open <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
