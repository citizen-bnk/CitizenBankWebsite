import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from "components/CurrencyProvider";

export default function Faqs() {
  const { formatCurrency } = useCurrency();
  const faqCategories = [
    {
      category: 'Account & Access',
      questions: [
        {
          q: 'How do I open an account with Citizen Bank?',
          a: 'You can open an account by visiting any of our branches with a valid ID (passport or national ID), proof of address, and an initial deposit. The process takes approximately 30 minutes.'
        },
        {
          q: 'I forgot my password. How can I reset it?',
          a: 'Click on "Forgot Password" on the login page, enter your email address, and follow the instructions sent to your email. If you need assistance, contact our support team at +266 2231 2345.'
        },
        {
          q: 'Can I access my account from outside Lesotho?',
          a: 'Yes, you can access your online banking account from anywhere in the world. However, for security purposes, we may request additional verification for transactions from new locations.'
        },
        {
          q: 'What should I do if I\'m locked out of my account?',
          a: 'After 3 failed login attempts, your account will be temporarily locked for security. Wait 30 minutes and try again, or contact our support team to unlock your account immediately.'
        }
      ]
    },
    {
      category: 'Transactions & Payments',
      questions: [
        {
          q: 'What are the transaction limits?',
          a: 'Daily transaction limits vary by account type: Standard accounts have a L50,000 daily limit, Premium accounts have L200,000, and Business accounts have L500,000. Limits can be adjusted by contacting your branch.'
        },
        {
          q: 'How long do transfers take?',
          a: 'Internal transfers between Citizen Bank accounts are instant. Transfers to other local banks typically take 1-2 business days. International transfers can take 3-5 business days.'
        },
        {
          q: 'Are there fees for transactions?',
          a: 'The first 5 transactions per month are free for all account holders. After that, a small fee applies: L5 for internal transfers, L15 for local bank transfers, and L50 for international transfers.'
        },
        {
          q: 'Can I schedule recurring payments?',
          a: 'Yes, you can set up recurring payments for bills, loan repayments, and regular transfers through your online banking portal or mobile app.'
        }
      ]
    },
    {
      category: 'Cards & ATMs',
      questions: [
        {
          q: 'How do I activate my new debit card?',
          a: 'You can activate your card at any Citizen Bank ATM using your PIN, through the mobile app, or by calling +266 2231 2345.'
        },
        {
          q: 'What should I do if my card is lost or stolen?',
          a: 'Call our 24/7 hotline immediately at +266 2231 9999 to block your card. You can also block it instantly through the mobile app. A replacement card will be issued within 5-7 business days.'
        },
        {
          q: 'Can I use my card internationally?',
          a: 'Yes, all our debit and credit cards work internationally. However, please inform us of your travel plans beforehand to avoid your card being blocked for suspicious activity.'
        },
        {
          q: 'Are there ATM withdrawal fees?',
          a: 'Withdrawals at Citizen Bank ATMs are free. Using other banks\' ATMs within Lesotho costs L10 per transaction. International ATM withdrawals may incur additional fees.'
        }
      ]
    },
    {
      category: 'Loans & Credit',
      questions: [
        {
          q: 'What types of loans do you offer?',
          a: 'We offer personal loans, home loans, vehicle financing, business loans, and education loans. Interest rates and terms vary by loan type and creditworthiness.'
        },
        {
          q: 'How do I apply for a loan?',
          a: 'You can apply online through your customer portal, visit any branch, or call us to schedule an appointment with a loan officer. You\'ll need ID, proof of income, and bank statements.'
        },
        {
          q: 'How long does loan approval take?',
          a: 'Personal loans are typically approved within 48 hours. Home loans and business loans may take 5-10 business days due to additional verification requirements.'
        },
        {
          q: 'Can I repay my loan early?',
          a: 'Yes, you can make early repayments without penalty. This can help reduce your overall interest costs. Contact us to discuss early settlement options.'
        }
      ]
    },
    {
      category: 'Investments & Shares',
      questions: [
        {
          q: 'How can I invest with Citizen Bank?',
          a: 'We offer various investment products including fixed deposits, money market funds, and share subscriptions. Log in to your portal and navigate to the Invest section to explore options.'
        },
        {
          q: 'What is the minimum investment amount?',
          a: `Minimum investment amounts vary: ${formatCurrency(1000)} for fixed deposits, ${formatCurrency(5000)} for money market funds, and ${formatCurrency(500)} per share for our share subscription program.`
        },
        {
          q: 'How do I subscribe to bank shares?',
          a: 'Visit the Share Subscription page when logged in, complete the subscription form, and make payment. You\'ll receive confirmation and share certificates within 30 days.'
        },
        {
          q: 'When are dividends paid?',
          a: 'Dividends are typically declared annually after the AGM and paid within 30 days to shareholders. Payment is made directly to your registered bank account.'
        }
      ]
    },
    {
      category: 'Security & Privacy',
      questions: [
        {
          q: 'How does Citizen Bank protect my information?',
          a: 'We use bank-level encryption, multi-factor authentication, and comply with international data protection standards. Your data is stored securely and never shared without your consent.'
        },
        {
          q: 'Will the bank ever ask for my password?',
          a: 'No, never. We will NEVER ask for your password, PIN, or OTP via email, phone, or SMS. If anyone asks for this information claiming to be from the bank, it\'s a scam.'
        },
        {
          q: 'How can I report suspicious activity?',
          a: 'Call our fraud hotline at +266 2231 9999 (24/7) or email security@citizenbank.co.ls. You can also report through the mobile app\'s security center.'
        },
        {
          q: 'What is two-factor authentication?',
          a: 'Two-factor authentication (2FA) adds an extra layer of security by requiring both your password and a verification code sent to your phone. We strongly recommend enabling it.'
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
              Find quick answers to common questions about our banking services
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
                Can't find the answer you're looking for? Our support team is here to help.
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  to="/contact"
                  className="px-6 py-2 bg-[#6d52a2] text-white rounded-lg font-semibold hover:bg-[#5a4289] transition-colors"
                >
                  Contact Support
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
