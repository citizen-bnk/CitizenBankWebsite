import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { FileText, CheckCircle2, Circle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function TermsOfService() {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreements, setAgreements] = useState({
    acceptance: false,
    eligibility: false,
    accountSecurity: false,
    prohibitedActivities: false,
    transactions: false,
    loans: false,
    investments: false,
    liability: false,
    termination: false,
    governingLaw: false,
  });

  const allAgreed = Object.values(agreements).every(v => v);

  // Track scroll to bottom
  useEffect(() => {
    const handleScroll = () => {
      const termsContent = document.getElementById('terms-content');
      if (!termsContent) return;

      const scrollTop = termsContent.scrollTop;
      const scrollHeight = termsContent.scrollHeight;
      const clientHeight = termsContent.clientHeight;

      // Consider "bottom" as within 50px of actual bottom
      if (scrollHeight - scrollTop - clientHeight < 50) {
        setHasScrolledToBottom(true);
      }
    };

    const termsContent = document.getElementById('terms-content');
    termsContent?.addEventListener('scroll', handleScroll);
    return () => termsContent?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAgreementChange = (key: keyof typeof agreements) => {
    setAgreements(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAcknowledge = () => {
    if (!hasScrolledToBottom) {
      toast.error('Please scroll to the bottom to read all terms');
      return;
    }
    if (!allAgreed) {
      toast.error('Please check all agreement boxes to continue');
      return;
    }
    toast.success('Terms acknowledged successfully');
    // You can add navigation or API call here
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-xl text-white/90">
              Legal terms and conditions for using Citizen Bank services
            </p>
            <p className="text-sm text-white/80 mt-2">Last updated: October 16, 2025</p>
          </div>
        </div>
      </section>

      {/* Terms Content with Scrollable Area */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Scroll Instruction */}
          {!hasScrolledToBottom && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Circle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Please read all terms</p>
                <p className="text-sm text-blue-700">Scroll to the bottom to review all sections before agreeing.</p>
              </div>
            </div>
          )}

          {hasScrolledToBottom && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Document reviewed</p>
                <p className="text-sm text-green-700">You've reached the end. Please check the boxes below to acknowledge each section.</p>
              </div>
            </div>
          )}

          {/* Scrollable Terms Content */}
          <div 
            id="terms-content"
            className="bg-white rounded-lg shadow-sm p-8 md:p-12 max-h-[600px] overflow-y-auto mb-8"
          >
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 mb-6">
                By accessing or using Citizen Bank's services, website, mobile applications, or any related services (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use our Services.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">2. Eligibility</h2>
              <p className="text-gray-600 mb-4">
                To use our Services, you must:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                <li>Be at least 18 years of age</li>
                <li>Have legal capacity to enter into a binding contract</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security and confidentiality of your account credentials</li>
                <li>Comply with all applicable laws and regulations in Lesotho</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">3. Account Registration and Security</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">3.1 Account Creation</h3>
              <p className="text-gray-600 mb-6">
                You are responsible for maintaining accurate account information. You must notify us immediately of any changes to your contact information, address, or employment status.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Account Security</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                <li>You are solely responsible for maintaining the confidentiality of your password and account</li>
                <li>You must not share your login credentials with anyone</li>
                <li>You are liable for all activities that occur under your account</li>
                <li>You must notify us immediately of any unauthorized access or security breach</li>
                <li>We reserve the right to suspend or terminate accounts showing suspicious activity</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">4. Use of Services</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.1 Permitted Use</h3>
              <p className="text-gray-600 mb-6">
                Our Services are provided for lawful personal or business banking purposes only. You may use our Services to manage accounts, conduct transactions, apply for loans, invest, and access other financial services we offer.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Prohibited Activities</h3>
              <p className="text-gray-600 mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                <li>Use our Services for any illegal or fraudulent purpose</li>
                <li>Engage in money laundering, terrorist financing, or other financial crimes</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Interfere with or disrupt the integrity or performance of our Services</li>
                <li>Use automated tools (bots, scrapers) without our express written permission</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Transmit viruses, malware, or other harmful code</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">5. Transactions and Payments</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">5.1 Transaction Authorization</h3>
              <p className="text-gray-600 mb-6">
                By initiating a transaction, you authorize us to debit your account for the specified amount plus any applicable fees. Once authorized, transactions cannot be cancelled, though they may be reversed in cases of error or fraud.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Transaction Limits</h3>
              <p className="text-gray-600 mb-6">
                We may impose daily, weekly, or monthly transaction limits based on your account type, transaction history, and risk assessment. Limits may be adjusted with proper verification.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.3 Fees and Charges</h3>
              <p className="text-gray-600 mb-6">
                You agree to pay all applicable fees as outlined in our Fee Schedule. We reserve the right to modify fees with 30 days' notice. Continued use of Services after fee changes constitutes acceptance.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">6. Loans and Credit</h2>
              <p className="text-gray-600 mb-4">
                Loan applications are subject to credit assessment and approval. By applying for a loan, you:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                <li>Authorize us to conduct credit checks and verify your information</li>
                <li>Agree to repay the loan according to the agreed terms and schedule</li>
                <li>Acknowledge that failure to repay may result in legal action and credit reporting</li>
                <li>Understand that interest rates and terms are determined based on creditworthiness</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">7. Investment Services</h2>
              <p className="text-gray-600 mb-6">
                Investment products carry risks, including potential loss of principal. Past performance does not guarantee future results. We do not provide investment advice unless explicitly stated. You are responsible for your investment decisions and should seek independent financial advice if needed.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">8. Intellectual Property</h2>
              <p className="text-gray-600 mb-6">
                All content, trademarks, logos, and intellectual property on our website and apps are owned by Citizen Bank or our licensors. You may not copy, reproduce, distribute, or create derivative works without our written permission.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">9. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                <li>We are not liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to the amount of fees paid in the 12 months preceding the claim</li>
                <li>We are not responsible for losses due to unauthorized access if you failed to maintain account security</li>
                <li>We are not liable for service interruptions due to maintenance, technical issues, or force majeure</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">10. Indemnification</h2>
              <p className="text-gray-600 mb-6">
                You agree to indemnify and hold harmless Citizen Bank, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from your use of our Services, violation of these Terms, or violation of any rights of others.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">11. Termination</h2>
              <p className="text-gray-600 mb-4">
                We may suspend or terminate your access to Services:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                <li>For violation of these Terms</li>
                <li>For suspected fraudulent or illegal activity</li>
                <li>At your request to close your account</li>
                <li>For prolonged inactivity (after proper notice)</li>
                <li>If required by law or regulatory authorities</li>
              </ul>
              <p className="text-gray-600 mb-6">
                Upon termination, you remain liable for all outstanding obligations, and applicable provisions of these Terms survive termination.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">12. Dispute Resolution</h2>
              <p className="text-gray-600 mb-6">
                Any disputes arising from these Terms or use of our Services shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes will be subject to the exclusive jurisdiction of the courts of Lesotho.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">13. Governing Law</h2>
              <p className="text-gray-600 mb-6">
                These Terms are governed by the laws of the Kingdom of Lesotho. Our Services comply with all applicable banking regulations and Central Bank of Lesotho requirements.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">14. Changes to Terms</h2>
              <p className="text-gray-600 mb-6">
                We reserve the right to modify these Terms at any time. Material changes will be communicated via email or prominent website notice at least 30 days before taking effect. Continued use of Services after changes constitutes acceptance.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">15. Contact Information</h2>
              <p className="text-gray-600 mb-2">
                For questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p className="text-gray-700"><strong>Legal Department</strong></p>
                <p className="text-gray-600">Citizen Bank</p>
                <p className="text-gray-600">Kingsway Street, Maseru 100, Lesotho</p>
                <p className="text-gray-600 mt-2">Email: legal@citizenbank.co.ls</p>
                <p className="text-gray-600">Phone: +266 2231 2345</p>
              </div>
            </div>
          </div>

          {/* Agreement Checkboxes */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Acknowledgment & Agreement</h3>
            <p className="text-sm text-gray-600 mb-6">
              Please check each box below to confirm you have read and agree to each section of the Terms of Service:
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="acceptance"
                  checked={agreements.acceptance}
                  onCheckedChange={() => handleAgreementChange('acceptance')}
                  className="mt-1"
                />
                <label htmlFor="acceptance" className="text-sm text-gray-700 cursor-pointer">
                  I have read and agree to the <strong>Acceptance of Terms</strong> section
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="eligibility"
                  checked={agreements.eligibility}
                  onCheckedChange={() => handleAgreementChange('eligibility')}
                  className="mt-1"
                />
                <label htmlFor="eligibility" className="text-sm text-gray-700 cursor-pointer">
                  I confirm I meet all <strong>Eligibility</strong> requirements (18+ years, legal capacity, accurate information)
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="accountSecurity"
                  checked={agreements.accountSecurity}
                  onCheckedChange={() => handleAgreementChange('accountSecurity')}
                  className="mt-1"
                />
                <label htmlFor="accountSecurity" className="text-sm text-gray-700 cursor-pointer">
                  I understand my responsibilities for <strong>Account Security</strong> and maintaining confidentiality of credentials
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="prohibitedActivities"
                  checked={agreements.prohibitedActivities}
                  onCheckedChange={() => handleAgreementChange('prohibitedActivities')}
                  className="mt-1"
                />
                <label htmlFor="prohibitedActivities" className="text-sm text-gray-700 cursor-pointer">
                  I agree not to engage in any <strong>Prohibited Activities</strong> including fraud, money laundering, or unauthorized access
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="transactions"
                  checked={agreements.transactions}
                  onCheckedChange={() => handleAgreementChange('transactions')}
                  className="mt-1"
                />
                <label htmlFor="transactions" className="text-sm text-gray-700 cursor-pointer">
                  I understand the terms for <strong>Transactions and Payments</strong>, including authorization, limits, and fees
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="loans"
                  checked={agreements.loans}
                  onCheckedChange={() => handleAgreementChange('loans')}
                  className="mt-1"
                />
                <label htmlFor="loans" className="text-sm text-gray-700 cursor-pointer">
                  I agree to the <strong>Loans and Credit</strong> terms, including credit checks and repayment obligations
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="investments"
                  checked={agreements.investments}
                  onCheckedChange={() => handleAgreementChange('investments')}
                  className="mt-1"
                />
                <label htmlFor="investments" className="text-sm text-gray-700 cursor-pointer">
                  I understand <strong>Investment Services</strong> carry risks and I am responsible for my investment decisions
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="liability"
                  checked={agreements.liability}
                  onCheckedChange={() => handleAgreementChange('liability')}
                  className="mt-1"
                />
                <label htmlFor="liability" className="text-sm text-gray-700 cursor-pointer">
                  I accept the <strong>Limitation of Liability</strong> and agree to indemnify Citizen Bank
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="termination"
                  checked={agreements.termination}
                  onCheckedChange={() => handleAgreementChange('termination')}
                  className="mt-1"
                />
                <label htmlFor="termination" className="text-sm text-gray-700 cursor-pointer">
                  I understand the <strong>Termination</strong> conditions and my ongoing obligations
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="governingLaw"
                  checked={agreements.governingLaw}
                  onCheckedChange={() => handleAgreementChange('governingLaw')}
                  className="mt-1"
                />
                <label htmlFor="governingLaw" className="text-sm text-gray-700 cursor-pointer">
                  I agree these Terms are governed by the <strong>Laws of Lesotho</strong> and changes may be made with notice
                </label>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button 
                onClick={handleAcknowledge}
                disabled={!hasScrolledToBottom || !allAgreed}
                className="w-full bg-[#6d52a2] hover:bg-[#5a4289] text-white"
                size="lg"
              >
                {!hasScrolledToBottom 
                  ? 'Please scroll to bottom first' 
                  : !allAgreed 
                  ? `Check all boxes to continue (${Object.values(agreements).filter(v => v).length}/${Object.keys(agreements).length})` 
                  : 'I Acknowledge and Agree to All Terms'}
              </Button>
              <p className="text-xs text-gray-500 mt-3 text-center">
                By clicking this button, you confirm you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
