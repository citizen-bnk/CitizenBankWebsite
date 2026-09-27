import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Cookie } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CookiePolicy() {
  const cookieTypes = [
    {
      type: 'Essential Cookies',
      description: 'Required for the website to function properly. These cannot be disabled.',
      examples: ['Session management', 'Security authentication', 'Load balancing']
    },
    {
      type: 'Performance Cookies',
      description: 'Help us understand how visitors interact with our website.',
      examples: ['Page views', 'Navigation patterns', 'Error tracking']
    },
    {
      type: 'Functional Cookies',
      description: 'Enable enhanced functionality and personalization.',
      examples: ['Language preferences', 'Region settings', 'Accessibility features']
    },
    {
      type: 'Marketing Cookies',
      description: 'Used to track visitors for advertising and marketing purposes.',
      examples: ['Ad targeting', 'Campaign effectiveness', 'User interests']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Cookie className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-xl text-white/90">
              How we use cookies and similar technologies on our website
            </p>
            <p className="text-sm text-white/80 mt-2">Last updated: October 16, 2025</p>
          </div>
        </div>
      </section>

      {/* Cookie Policy Content */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 md:p-12">
          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-600 mb-6">
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners. Cookies help us recognize you, remember your preferences, and improve your browsing experience.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">2. How We Use Cookies</h2>
            <p className="text-gray-600 mb-6">
              Citizen Bank uses cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Keep you logged in to your online banking account</li>
              <li>Remember your preferences and settings</li>
              <li>Understand how you use our website and improve our services</li>
              <li>Provide personalized content and recommendations</li>
              <li>Ensure security and prevent fraud</li>
              <li>Analyze website performance and user behavior</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">3. Types of Cookies We Use</h2>
            <div className="space-y-4 mb-8">
              {cookieTypes.map((cookie) => (
                <Card key={cookie.type}>
                  <CardHeader>
                    <CardTitle className="text-lg">{cookie.type}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">{cookie.description}</p>
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Examples:</p>
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                        {cookie.examples.map((example, index) => (
                          <li key={index}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">4. First-Party vs Third-Party Cookies</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.1 First-Party Cookies</h3>
            <p className="text-gray-600 mb-6">
              These are cookies set directly by Citizen Bank. We use them to provide essential banking services, remember your preferences, and analyze how you use our website.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Third-Party Cookies</h3>
            <p className="text-gray-600 mb-6">
              Some cookies are placed by third-party services that appear on our pages. We use carefully selected partners for analytics (Google Analytics), security (reCAPTCHA), and performance monitoring. These third parties may use cookies to collect information about your online activities across different websites.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">5. Session vs Persistent Cookies</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">5.1 Session Cookies</h3>
            <p className="text-gray-600 mb-6">
              These are temporary cookies that expire when you close your browser. They help us maintain your session as you navigate through our online banking platform.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Persistent Cookies</h3>
            <p className="text-gray-600 mb-6">
              These cookies remain on your device for a set period or until you delete them. They help us recognize you when you return to our website and remember your preferences.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">6. Managing Your Cookie Preferences</h2>
            <p className="text-gray-600 mb-4">
              You have several options to manage or disable cookies:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">6.1 Browser Settings</h3>
            <p className="text-gray-600 mb-4">
              Most browsers allow you to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>View what cookies are stored and delete them individually</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies from specific websites</li>
              <li>Block all cookies from being set</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Browser-Specific Instructions</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">6.3 Important Notice</h3>
            <p className="text-gray-600 mb-6">
              <strong>Please note:</strong> Blocking or deleting cookies may impact your ability to use certain features of our online banking platform. Essential cookies are necessary for the website to function and cannot be disabled without affecting core functionality.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">7. Do Not Track</h2>
            <p className="text-gray-600 mb-6">
              Some browsers have a "Do Not Track" feature that lets you tell websites you do not want to have your online activities tracked. Currently, there is no industry standard for how websites should respond to Do Not Track signals. We do not currently respond to Do Not Track signals.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">8. Mobile Applications</h2>
            <p className="text-gray-600 mb-6">
              Our mobile banking apps may use similar technologies to cookies (such as SDKs and mobile identifiers) to provide functionality, analytics, and personalized experiences. You can manage these through your device's privacy settings.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">9. Analytics and Advertising</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">9.1 Analytics</h3>
            <p className="text-gray-600 mb-6">
              We use Google Analytics to understand how visitors use our website. This helps us improve our services and user experience. Google Analytics uses cookies to collect information anonymously and report website trends.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">9.2 Advertising</h3>
            <p className="text-gray-600 mb-6">
              We may use cookies to deliver relevant advertisements about our products and services. You can opt out of personalized advertising through your browser settings or by visiting industry opt-out pages.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">10. Updates to This Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our business practices. We will notify you of significant changes by posting a notice on our website or sending you an email.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">11. More Information</h2>
            <p className="text-gray-600 mb-6">
              For more information about how we handle your personal data, please see our <a href="/privacy-policy" className="text-[#6d52a2] hover:underline">Privacy Policy</a>.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">12. Contact Us</h2>
            <p className="text-gray-600 mb-2">
              If you have questions about our use of cookies, please contact us:
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
