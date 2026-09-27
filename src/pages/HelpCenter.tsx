import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CreditCard, Smartphone, Lock, TrendingUp, FileText, Users, Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      icon: CreditCard,
      title: 'Accounts & Cards',
      description: 'Manage your accounts, cards, and transactions',
      articles: 8
    },
    {
      icon: Smartphone,
      title: 'Digital Banking',
      description: 'Mobile banking, online services, and apps',
      articles: 12
    },
    {
      icon: Lock,
      title: 'Security & Privacy',
      description: 'Keep your account safe and secure',
      articles: 6
    },
    {
      icon: TrendingUp,
      title: 'Investments & Loans',
      description: 'Investment products and lending services',
      articles: 10
    },
    {
      icon: FileText,
      title: 'Documents & Reports',
      description: 'Statements, disclosures, and reports',
      articles: 5
    },
    {
      icon: Users,
      title: 'Account Setup',
      description: 'Getting started with Citizen Bank',
      articles: 7
    }
  ];

  const popularArticles = [
    { title: 'How to reset your password', category: 'Security & Privacy' },
    { title: 'Understanding transaction fees', category: 'Accounts & Cards' },
    { title: 'Setting up mobile banking', category: 'Digital Banking' },
    { title: 'How to apply for a loan', category: 'Investments & Loans' },
    { title: 'Viewing your account statements', category: 'Documents & Reports' },
    { title: 'Updating your contact information', category: 'Account Setup' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section with Search */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Help Center</h1>
            <p className="text-lg sm:text-xl text-white/90 mb-8">
              Search our knowledge base for answers to your questions
            </p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for help articles..."
                className="pl-12 py-6 text-lg bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Browse Categories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.title} className="hover:shadow-lg hover:border-[#6d52a2] transition-all group cursor-pointer">
                <CardHeader>
                  <div className="p-3 rounded-lg bg-[#6d52a2]/10 w-fit mb-2 group-hover:bg-[#6d52a2]/20 transition-colors">
                    <Icon className="h-6 w-6 text-[#6d52a2]" />
                  </div>
                  <CardTitle className="group-hover:text-[#6d52a2] transition-colors">
                    {category.title}
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{category.articles} articles</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Popular Articles */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Articles</h2>
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {popularArticles.map((article, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      <div>
                        <div className="font-medium text-gray-900">{article.title}</div>
                        <div className="text-sm text-gray-500 mt-1">{article.category}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-gray-600 space-y-2">
                        <p>
                          This is where the detailed answer to "{article.title}" would appear. 
                          Our comprehensive help articles provide step-by-step guidance for all your banking needs.
                        </p>
                        <p className="text-sm">
                          For personalized assistance, please{' '}
                          <Link to="/contact" className="text-[#6d52a2] hover:underline">
                            contact our support team
                          </Link>.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Still Need Help */}
      <section className="bg-white border-t border-gray-200 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Still need help?</h2>
            <p className="text-gray-600 mb-6">
              Can't find what you're looking for? Our support team is here to assist you.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/contact"
                className="px-8 py-3 bg-[#6d52a2] text-white rounded-lg font-semibold hover:bg-[#5a4289] transition-colors inline-flex items-center gap-2"
              >
                Contact Support <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/faqs"
                className="px-8 py-3 border-2 border-[#6d52a2] text-[#6d52a2] rounded-lg font-semibold hover:bg-[#6d52a2]/10 transition-colors"
              >
                View FAQs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
