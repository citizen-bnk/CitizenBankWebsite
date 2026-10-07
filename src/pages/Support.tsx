import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Shield, FileQuestion, Mail, ArrowRight } from 'lucide-react';

export default function Support() {
  const supportResources = [
    {
      icon: HelpCircle,
      title: 'Help Center',
      description: 'Answers to common questions about the platform',
      link: '/help-center',
      color: '#6d52a2'
    },
    {
      icon: Mail,
      title: 'Contact Us',
      description: 'How to reach Citizen Bank',
      link: '/contact',
      color: '#8f6ec4'
    },
    {
      icon: Shield,
      title: 'Security Tips',
      description: 'General advice for staying safe from fraud and scams',
      link: '/security-tips',
      color: '#8f6ec4'
    },
    {
      icon: FileQuestion,
      title: 'FAQs',
      description: 'Quick answers to frequently asked questions',
      link: '/faqs',
      color: '#6d52a2'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">How Can We Help You?</h1>
            <p className="text-lg sm:text-xl text-white/90">
              Support resources and how to contact us
            </p>
          </div>
        </div>
      </section>

      {/* Support Resources Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supportResources.map((resource) => {
            const Icon = resource.icon;
            return (
              <Link key={resource.title} to={resource.link}>
                <Card className="h-full hover:shadow-lg hover:border-[#6d52a2] transition-all group cursor-pointer">
                  <CardHeader>
                    <div className="p-3 rounded-lg bg-[#6d52a2]/10 w-fit mb-2 group-hover:bg-[#6d52a2]/20 transition-colors">
                      <Icon className="h-6 w-6" style={{ color: resource.color }} />
                    </div>
                    <CardTitle className="group-hover:text-[#6d52a2] transition-colors">
                      {resource.title}
                    </CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-[#6d52a2] font-medium inline-flex items-center gap-1 text-sm">
                      Learn More <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
