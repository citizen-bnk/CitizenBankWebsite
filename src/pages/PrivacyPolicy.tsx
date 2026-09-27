import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-white/90">
              How we collect, use, and protect your personal information
            </p>
            <p className="text-sm text-white/80 mt-2">Last updated: October 16, 2025</p>
          </div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 md:p-12">
          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-6">
              Citizen Bank ("we", "us", or "our") is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, store, and share your information when you use our banking services, websites, and mobile applications.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.1 Personal Information</h3>
            <p className="text-gray-600 mb-4">We collect the following types of personal information:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Identification information (name, date of birth, ID/passport number, nationality)</li>
              <li>Contact information (address, phone number, email address)</li>
              <li>Financial information (account details, transaction history, income information)</li>
              <li>Employment information (employer details, occupation, income source)</li>
              <li>Biometric data (fingerprints, facial recognition for authentication purposes)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent on platform)</li>
              <li>Location data (when you use our mobile app or visit branches)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use your information for the following purposes:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Providing and managing your banking services and accounts</li>
              <li>Processing transactions and payment instructions</li>
              <li>Verifying your identity and preventing fraud</li>
              <li>Complying with legal and regulatory requirements (KYC, AML, tax reporting)</li>
              <li>Communicating with you about your accounts and services</li>
              <li>Improving our products, services, and customer experience</li>
              <li>Marketing our products and services (with your consent)</li>
              <li>Assessing creditworthiness for loan applications</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">4. How We Share Your Information</h2>
            <p className="text-gray-600 mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Service Providers:</strong> Third-party vendors who provide services on our behalf (payment processors, IT support, marketing agencies)</li>
              <li><strong>Regulatory Authorities:</strong> Government agencies, central banks, and regulatory bodies as required by law</li>
              <li><strong>Credit Bureaus:</strong> For credit assessment and reporting purposes</li>
              <li><strong>Other Financial Institutions:</strong> When processing inter-bank transactions</li>
              <li><strong>Legal Purposes:</strong> When required by law, court order, or to protect our legal rights</li>
            </ul>
            <p className="text-gray-600 mb-6">
              We do not sell your personal information to third parties for marketing purposes.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>256-bit SSL encryption for all online transactions</li>
              <li>Multi-factor authentication for account access</li>
              <li>Regular security audits and penetration testing</li>
              <li>Secure data centers with physical and digital access controls</li>
              <li>Employee training on data protection and privacy</li>
              <li>Incident response and breach notification procedures</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">6. Data Retention</h2>
            <p className="text-gray-600 mb-6">
              We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Account information is typically retained for 7 years after account closure as required by banking regulations. Transaction records are kept for 10 years for audit and compliance purposes.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">7. Your Rights</h2>
            <p className="text-gray-600 mb-4">You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your information (subject to legal requirements)</li>
              <li><strong>Objection:</strong> Object to processing of your information for marketing purposes</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service provider</li>
              <li><strong>Withdrawal of Consent:</strong> Withdraw consent for optional data processing</li>
            </ul>
            <p className="text-gray-600 mb-6">
              To exercise these rights, contact us at privacy@citizenbank.co.ls or visit any branch with valid identification.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">8. Cookies and Tracking</h2>
            <p className="text-gray-600 mb-6">
              We use cookies and similar technologies to improve your experience on our website and mobile app. You can control cookie settings through your browser preferences. For more details, see our <a href="/cookie-policy" className="text-[#6d52a2] hover:underline">Cookie Policy</a>.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">9. Third-Party Links</h2>
            <p className="text-gray-600 mb-6">
              Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">10. Children's Privacy</h2>
            <p className="text-gray-600 mb-6">
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a minor, please contact us immediately.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">11. Changes to This Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update this Privacy Policy from time to time. We will notify you of material changes by email or through prominent notices on our website. Your continued use of our services after such modifications constitutes acceptance of the updated policy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">12. Contact Us</h2>
            <p className="text-gray-600 mb-2">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="text-gray-700"><strong>Data Protection Officer</strong></p>
              <p className="text-gray-600">Citizen Bank</p>
              <p className="text-gray-600">Kingsway Street, Maseru 100, Lesotho</p>
              <p className="text-gray-600 mt-2">Email: privacy@citizenbank.co.ls</p>
              <p className="text-gray-600">Phone: +266 2231 2345</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
