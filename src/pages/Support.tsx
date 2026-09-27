import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Phone, MapPin, Shield, FileQuestion, Mail, ArrowRight } from 'lucide-react';

export default function Support() {
  const supportResources = [
    {
      icon: HelpCircle,
      title: 'Help Center',
      description: 'Browse our comprehensive knowledge base and find answers to common questions',
      link: '/help-center',
      color: '#6d52a2'
    },
    {
      icon: Mail,
      title: 'Contact Us',
      description: 'Get in touch with our support team via email, phone, or contact form',
      link: '/contact',
      color: '#8f6ec4'
    },
    {
      icon: MapPin,
      title: 'Branch Locator',
      description: 'Find your nearest Citizen Bank branch with addresses and operating hours',
      link: '/branch-locator',
      color: '#6d52a2'
    },
    {
      icon: Shield,
      title: 'Security Tips',
      description: 'Learn how to protect your account and stay safe from fraud and scams',
      link: '/security-tips',
      color: '#8f6ec4'
    },
    {
      icon: FileQuestion,
      title: 'FAQs',
      description: 'Quick answers to frequently asked questions about our services',
      link: '/faqs',
      color: '#6d52a2'
    },
    {
      icon: Phone,
      title: 'Emergency Support',
      description: '24/7 hotline for urgent account issues and card blocking',
      link: '/contact',
      color: '#8f6ec4'
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
              Access our support resources, contact our team, or find your nearest branch
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

      {/* Quick Contact */}
      <section className="bg-white border-t border-gray-200 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Need Immediate Assistance?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <Phone className="h-8 w-8 text-[#6d52a2] mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
                <p className="text-sm text-gray-600">+266 2231 2345</p>
                <p className="text-xs text-gray-500 mt-1">Mon-Fri: 8am-5pm</p>
              </div>
              <div>
                <Mail className="h-8 w-8 text-[#6d52a2] mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Email Us</h3>
                <p className="text-sm text-gray-600">support@citizenbank.co.ls</p>
                <p className="text-xs text-gray-500 mt-1">Response within 24 hours</p>
              </div>
              <div>
                <MapPin className="h-8 w-8 text-[#6d52a2] mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Visit Us</h3>
                <p className="text-sm text-gray-600">Kingsway Street, Maseru</p>
                <p className="text-xs text-gray-500 mt-1">
                  <Link to="/branch-locator" className="text-[#6d52a2] hover:underline">
                    View all branches
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
