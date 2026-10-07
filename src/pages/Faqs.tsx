import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePolicy } from "utils/policy";

export default function Faqs() {
  const policy = usePolicy();
  const faqCategories = [
    {
      category: 'About Citizen Bank',
      questions: [
        {
          q: 'Does Citizen Bank hold a banking licence?',
          a: `No. ${policy.legal.company_name} has applied for one and the application is not decided. See the notice at the bottom of this page.`
        },
        {
          q: 'Can I open an account or deposit money?',
          a: 'No. Citizen Bank does not currently offer accounts, deposits, loans or cards. The banking screens on this site and in our apps are a pre-licensing demonstration that uses simulated money.'
        },
        {
          q: 'What is the demonstration?',
          a: 'A separate environment that shows how the platform is intended to work, with sample accounts for different roles. Nothing in it is a real account or a real transaction. You can try it from the Demonstration link in the menu.'
        }
      ]
    },
    {
      category: 'Investing',
      questions: [
        {
          q: 'How can I invest?',
          a: 'Eligible investors can subscribe to shares in Citizen Digital Ltd. Sign in and open the Invest section to see the options available to you. Share classes, prices and payment options are shown in the subscription flow.'
        },
        {
          q: 'Are shares a deposit or a guaranteed return?',
          a: 'No. Shares are not deposits. Their value can go down as well as up, and no return is guaranteed.'
        },
        {
          q: 'Where can I read about the licence application and company documents?',
          a: 'Investors who have subscribed can use the Investor Data Room. Public reports, when there are any, will be listed on the Public Disclosures page.'
        }
      ]
    },
    {
      category: 'Security & Privacy',
      questions: [
        {
          q: 'How do I sign in?',
          a: 'You can sign in with a passkey or the other methods offered on the sign-in page. One sign-in covers the website, the investor and board Hub, and the demonstration banking apps.'
        },
        {
          q: 'Will Citizen Bank ever ask for my password?',
          a: 'No. We will never ask for your password, PIN or one-time code by email, phone or message. If someone asks for these and says they are from Citizen Bank, do not give them.'
        },
        {
          q: 'How do I report something suspicious?',
          a: 'Use the contact details on the Contact page. See also our Security Tips.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <HelpCircle className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-white/90">
              Answers to common questions about Citizen Bank and this website
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {faqCategories.map((category) => (
            <div key={category.category}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{category.category}</h2>
              <Card>
                <CardContent className="pt-6">
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`${category.category}-${index}`}>
                        <AccordionTrigger className="text-left font-medium">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card className="border-[#6d52a2] bg-[#6d52a2]/5">
            <CardContent className="pt-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Still have questions?</h3>
              <p className="text-gray-600 mb-4">
                Can't find the answer you're looking for?
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  to="/contact"
                  className="px-6 py-2 bg-[#6d52a2] text-white rounded-lg font-semibold hover:bg-[#5a4289] transition-colors"
                >
                  Contact
                </Link>
                <Link
                  to="/help-center"
                  className="px-6 py-2 border-2 border-[#6d52a2] text-[#6d52a2] rounded-lg font-semibold hover:bg-[#6d52a2]/10 transition-colors"
                >
                  Help Center
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
