import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { MetricCard } from "components/MetricCard";
import { PortalCard } from "components/PortalCard";
import { CurrencyIndicator } from "components/CurrencyIndicator";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUser } from "@stackframe/react";
import { useUserRoles } from "utils/useUserRoles";
import {
  Users,
  TrendingUp,
  Building2,
  Settings,
  FileText,
  Newspaper,
  Leaf,
  DollarSign,
  ArrowRight,
  Shield,
  Clock,
  Award,
  HandCoins,
  UserPlus,
} from "lucide-react";

export default function App() {
  const user = useUser();
  const { roles, loading: rolesLoading } = useUserRoles();
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  // Citizen Bank customer images
  const heroBackgrounds = [
    'https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%201.png',
    'https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%203.png',
    'https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%204.png',
    'https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%207.png',
  ];

  // Rotate background images every 2 minutes (120000ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % heroBackgrounds.length);
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  // Determine which portals the user has access to
  const hasCustomerAccess = roles.includes('customer');
  const hasInvestorAccess = roles.includes('investor');
  const hasBoardAccess = roles.includes('board_member');
  const hasBackOfficeAccess = roles.includes('super_admin') || roles.includes('staff');

  // Only show portals section if user is logged in and has at least one portal access
  const showPortalsSection = user && !rolesLoading && (hasCustomerAccess || hasInvestorAccess || hasBoardAccess || hasBackOfficeAccess);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section 
        className="page-container relative bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{
          backgroundImage: `url("${heroBackgrounds[currentBgIndex]}")`,
        }}
      >
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#6d52a2]/25 via-[#6d52a2]/20 to-[#5a4289]/27" />
        
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
  <span
    className="bg-gradient-to-r from-white via-yellow-300 to-orange-500 bg-clip-text text-transparent"
  >
    Welcome to
  </span>{" "}
  <span className="text-white">
    Citizen
  </span>{" "}
  <span className="text-white">
    Bank
  </span>
</h1>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-white/90">
              Your comprehensive banking platform for all financial services.
              Access customer banking, investments, governance, and back office systems from one unified hub.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {!user ? (
                <>
                  <Link
                    to="/auth/sign-up"
                    className="px-6 sm:px-8 py-3 bg-white text-[#6d52a2] rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <UserPlus className="h-5 w-5" />
                    Open an Account
                  </Link>
                  <Link
                    to="/auth/sign-in"
                    className="px-6 sm:px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors text-center text-sm sm:text-base"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/customer-portal"
                    className="px-6 sm:px-8 py-3 bg-white text-[#6d52a2] rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    Go to Customer Portal
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/invest"
                    className="px-6 sm:px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors text-center text-sm sm:text-base"
                  >
                    Explore Investments
                  </Link>
                  <Link
                    to="/share-subscription"
                    className="px-6 sm:px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <HandCoins className="h-5 w-5" />
                    Subscribe to Shares
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Admin Setup Notice - Only show if user is not logged in or is super admin */}
      {(!user || roles.includes('super_admin')) && (
        <section className="container mx-auto px-4 py-8">
          <div className="bg-[#6d52a2]/5 border border-[#6d52a2] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-[#6d52a2] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <strong className="text-[#6d52a2] text-base">System Administrators:</strong>
                    <p className="text-sm text-gray-700 mt-1">
                      {user && roles.includes('super_admin') 
                        ? 'Manage admin users and back office staff through the setup guide.'
                        : 'Set up your first administrator account and configure back office access.'}
                    </p>
                  </div>
                  <Link to="/admin-setup-guide">
                    <button className="px-4 py-2 border border-[#6d52a2] text-[#6d52a2] hover:bg-[#6d52a2] hover:text-white rounded-lg transition-colors whitespace-nowrap flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Setup Guide
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Access Portals */}
      {showPortalsSection && (
        <section 
          className="relative py-16 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%207.png")',
          }}
        >
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#6d52a2]/80 to-[#5a4289]/80 backdrop-blur-sm" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">
                Access Your Systems
              </h2>
              <p className="text-white/90">
                Quick access to your authorized banking portals
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {hasCustomerAccess && (
                <PortalCard
                  icon={Users}
                  title="Customer Portal"
                  description="Personal and business banking services, accounts, transfers, and loans"
                  link="/customer-portal"
                />
              )}
              {hasInvestorAccess && (
                <PortalCard
                  icon={TrendingUp}
                  title="Investor Portal"
                  description="Investment products, portfolio tracking, and financial disclosures"
                  link="/invest"
                />
              )}
              {hasBoardAccess && (
                <PortalCard
                  icon={Building2}
                  title="Board Portal"
                  description="Governance documents, meeting materials, and strategic reports"
                  link="/board-portal"
                />
              )}
              {hasBackOfficeAccess && (
                <PortalCard
                  icon={Settings}
                  title="Back Office"
                  description="Internal operations, compliance, reporting, and administration"
                  link="/back-office-dashboard"
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Performance Dashboard */}
      <section className="bg-white border-y border-gray-200 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Bank Performance Overview
            </h2>
            <p className="text-gray-600 mb-4">
              Real-time metrics and key performance indicators
            </p>
            <CurrencyIndicator />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              icon={Users}
              label="Active Customers"
              value="24,500"
              change="12%"
              positive={true}
            />
            <MetricCard
              icon={DollarSign}
              label="Total Assets"
              value={2400000000}
              change="8.5%"
              positive={true}
              isCurrency={true}
            />
            <MetricCard
              icon={TrendingUp}
              label="Investment Portfolio"
              value={850000000}
              change="15.2%"
              positive={true}
              isCurrency={true}
            />
            <MetricCard
              icon={Award}
              label="Customer Satisfaction"
              value="94%"
              change="3%"
              positive={true}
            />
          </div>
        </div>
      </section>

      {/* Information & Resources */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/disclosures"
            className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg hover:border-[#6d52a2] transition-all group"
          >
            <FileText className="h-10 w-10 text-[#6d52a2] mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#6d52a2]">
              Public Disclosures
            </h3>
            <p className="text-gray-600 mb-4">
              Access financial reports, compliance documents, and regulatory filings
            </p>
            <span className="text-[#6d52a2] font-medium inline-flex items-center gap-1">
              View Disclosures <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            to="/media"
            className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg hover:border-[#6d52a2] transition-all group"
          >
            <Newspaper className="h-10 w-10 text-[#6d52a2] mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#6d52a2]">
              Media Center
            </h3>
            <p className="text-gray-600 mb-4">
              Latest news, press releases, and announcements from Citizen Bank
            </p>
            <span className="text-[#6d52a2] font-medium inline-flex items-center gap-1">
              Read News <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            to="/sustainability"
            className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg hover:border-[#6d52a2] transition-all group"
          >
            <Leaf className="h-10 w-10 text-[#6d52a2] mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#6d52a2]">
              Sustainability & CSR
            </h3>
            <p className="text-gray-600 mb-4">
              Our commitment to social responsibility and environmental sustainability
            </p>
            <span className="text-[#6d52a2] font-medium inline-flex items-center gap-1">
              Learn More <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <Shield className="h-12 w-12 text-[#6d52a2] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Bank-Level Security</h3>
              <p className="text-sm text-gray-600">
                Your data is protected with industry-leading encryption and security protocols
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="h-12 w-12 text-[#6d52a2] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">24/7 Access</h3>
              <p className="text-sm text-gray-600">
                Access your accounts and services anytime, anywhere from any device
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Award className="h-12 w-12 text-[#6d52a2] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Award-Winning Service</h3>
              <p className="text-sm text-gray-600">
                Recognized for excellence in banking services across the Kingdom of Lesotho
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
