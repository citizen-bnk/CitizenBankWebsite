import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { TrendingUp, DollarSign, FileText, HandCoins, Wallet, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "@stackframe/react";
import { useState, useEffect } from "react";
import { apiClient } from "app";
import { useCurrency } from "components/CurrencyProvider";
import { InvitationCard } from "components/InvitationCard";
import { useUserRoles } from "utils/useUserRoles";
import { NewsCarousel } from "components/NewsCarousel";
import { ChatWidget } from "components/ChatWidget";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// Type definitions based on actual API responses
interface InvestmentData {
  total_shares_owned: number;
  total_invested: number;
  class_breakdown: Array<{
    share_class: string;
    total_shares: number;
    total_amount: number;
    subscriptions: any[];
  }>;
  all_subscriptions: any[];
}

interface SubscriptionsData {
  summary: {
    total_shares_owned: number;
    total_investment_amount: number;
    active_subscriptions: number;
    pending_payments: number;
    certificates_issued: number;
  };
  subscriptions: any[];
  has_admin_created_subscriptions: boolean;
}

export default function Invest() {
  const user = useUser();
  const navigate = useNavigate();
  const { roles, loading: rolesLoading } = useUserRoles();
  const [investment, setInvestment] = useState<InvestmentData | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  // Check if user is a board member
  const isBoardMember = roles.includes('board_member');
  const canInvite = isBoardMember && (investment || (subscriptions && subscriptions.subscriptions.length > 0));
  
  // Check if user is admin or super admin
  const isAdmin = roles.includes('admin') || roles.includes('super_admin');
  
  // Handle subscribe button click - route based on role
  const handleSubscribeClick = () => {
    if (isAdmin) {
      navigate('/back-office-subscribe-on-behalf');
    } else {
      navigate('/share-subscription');
    }
  };

  useEffect(() => {
    console.log('🔄 Invest page: useEffect triggered. User ID:', user?.id);
    
    async function loadInvestorData() {
      if (!user) {
        setLoading(false);
        return;
      }

      // Wait for roles to load first
      if (rolesLoading) {
        return;
      }

      console.log('📊 Invest page: Loading investor data for user', user.id);

      // Only fetch board investment data if user is a board member
      if (isBoardMember) {
        try {
          const investmentRes = await apiClient.get_my_investment();
          if (investmentRes.ok) {
            const investmentData = await investmentRes.json();
            setInvestment(investmentData);
          }
        } catch (error) {
          console.error('Error loading investment:', error);
        }
      } else {
        console.log('User is not a board member (this is normal)');
      }

      try {
        const subRes = await apiClient.core_get_my_public_subscriptions();
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscriptions(subData);
        }
      } catch (error) {
        console.error('Error loading subscriptions:', error);
      }

      setLoading(false);
    }

    loadInvestorData();
  }, [user?.id, isBoardMember, rolesLoading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl">
            <h1 className="text-4xl font-bold mb-4">
              {user ? 'My Investment Portfolio' : 'Invest in Citizen Bank'}
            </h1>
            {user ? (
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <p className="text-xl text-white/90">
                  Track your share subscriptions and investments
                </p>
                <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                  <Link to="/share-subscription">
                    <Button
                      size="lg"
                      className="bg-white text-[#6d52a2] hover:bg-transparent hover:text-white border-2 border-white shadow-lg hover:shadow-xl transition-all font-semibold w-full"
                    >
                      <HandCoins className="w-5 h-5 mr-2" />
                      Subscribe to Shares
                    </Button>
                  </Link>
                  <Link to="/my-subscriptions">
                    <Button
                      size="lg"
                      className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#6d52a2] font-semibold transition-all w-full"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      View My Subscriptions
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xl text-white/90">
                Share subscriptions in Citizen Digital Ltd are open to eligible investors. Sign in to see what is available to you.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* News Carousel */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Latest News & Achievements</h2>
          <p className="text-gray-600">Stay informed with our latest updates, milestones, and announcements</p>
        </div>
        <NewsCarousel />
      </section>

      {/* Investor Portfolio - For logged in users */}
      {user && (
        <section className="container mx-auto px-4 py-12 sm:py-16">
          {/* Invitation Card - Show for board members with investments */}
          {canInvite && (
            <div className="mb-8">
              <InvitationCard variant="primary" />
            </div>
          )}

          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Your Investments</h2>
                <p className="text-sm sm:text-base text-gray-600">Overview of your investment portfolio and shareholdings</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Link to="/share-subscription">
                  <button
                    className="px-4 sm:px-5 py-2 bg-[#6d52a2] text-white rounded-lg font-medium hover:bg-[#5a4289] transition-colors inline-flex items-center justify-center gap-2 text-sm whitespace-nowrap w-full"
                  >
                    <HandCoins className="h-4 w-4" />
                    Subscribe Now
                  </button>
                </Link>
                <Link
                  to="/my-subscriptions"
                  className="px-4 sm:px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2 text-sm whitespace-nowrap w-full"
                >
                  <FileText className="h-4 w-4" />
                  View Details
                </Link>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#6d52a2] border-r-transparent"></div>
              <p className="text-gray-600 mt-4">Loading your portfolio...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Share Subscription Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <HandCoins className="h-7 w-7 sm:h-8 sm:w-8 text-[#6d52a2]" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Share Subscriptions</h3>
                  </div>
                  {subscriptions && subscriptions.subscriptions.length > 0 ? (
                    <div className="space-y-4">
                      {/* Summary */}
                      {subscriptions.summary && (
                        <div className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-white/80 text-xs sm:text-sm">Total Shares</p>
                              <p className="text-xl sm:text-2xl font-bold">{(subscriptions.summary.total_shares_owned ?? 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-white/80 text-xs sm:text-sm">Total Investment</p>
                              <p className="text-xl sm:text-2xl font-bold">{formatCurrency(parseFloat(subscriptions.summary.total_investment_amount ?? '0'))}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Subscription List */}
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {subscriptions.subscriptions.map((sub) => (
                          <div key={sub.subscription_id} className="border border-gray-200 rounded-lg p-3 hover:border-[#6d52a2] transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-gray-900">{(sub.num_shares ?? 0).toLocaleString()} shares</p>
                                <p className="text-xs sm:text-sm text-gray-600">{sub.share_class ?? 'Class B'}</p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  sub.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : sub.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Amount:</span>
                              <span className="font-semibold">{formatCurrency(parseFloat(sub.total_amount))}</span>
                            </div>
                            {sub.certificate_url && (
                              <a
                                href={sub.certificate_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block mt-2 text-sm text-[#6d52a2] hover:text-[#5a4289] font-medium"
                              >
                                View Certificate →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <Link
                        to="/my-subscriptions"
                        className="block mt-3 text-center px-4 py-2 border-2 border-[#6d52a2] text-[#6d52a2] rounded-lg hover:bg-[#6d52a2]/10 transition-colors font-medium text-sm sm:text-base"
                      >
                        View All Details
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <HandCoins className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm sm:text-base text-gray-600 mb-4">You haven't subscribed to shares yet</p>
                      <Link to="/share-subscription">
                        <button
                          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 bg-[#6d52a2] text-white rounded-lg hover:bg-[#5a4289] transition-colors text-sm sm:text-base w-full"
                        >
                          <HandCoins className="h-4 w-4 sm:h-5 sm:w-5" />
                          Subscribe Now
                        </button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Board Investment Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="h-7 w-7 sm:h-8 sm:w-8 text-[#6d52a2]" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Board Investment</h3>
                  </div>
                  {investment ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Investment Type:</span>
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">{investment.option_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Amount Invested:</span>
                        <span className="font-semibold text-[#6d52a2] text-base sm:text-lg">
                          {formatCurrency(investment.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                            investment.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : investment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {investment.status}
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs sm:text-sm text-gray-600">
                          Submitted: {new Date(investment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm sm:text-base text-gray-600 mb-4">No active board investments</p>
                      <Link
                        to="/board-investment"
                        className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 bg-[#6d52a2] text-white rounded-lg hover:bg-[#5a4289] transition-colors text-sm sm:text-base"
                      >
                        <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                        Explore Options
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Room Access Card - For Investors */}
              {(investment || (subscriptions && subscriptions.subscriptions.length > 0)) && (
                <div className="bg-gradient-to-br from-[#6d52a2] to-[#5a4289] text-white rounded-lg p-5 sm:p-6 mb-6 sm:mb-8">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Investor Data Room</h3>
                  </div>
                  <p className="text-sm sm:text-base text-white/90 mb-4">
                    Access documents about the banking licence application and other investor materials.
                  </p>
                  <Link 
                    to="/data-room-access"
                    className="inline-flex items-center gap-2 bg-white text-[#6d52a2] px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-sm sm:text-base"
                  >
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    Access Data Room
                  </Link>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] rounded-lg p-6 sm:p-8 text-white">
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">More ways to invest</h3>
                <p className="text-sm sm:text-base text-white/90 mb-4 sm:mb-6">
                  Subscribe to more shares or view the other investment options open to you
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link to="/share-subscription">
                    <button
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-[#6d52a2] rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2 text-sm sm:text-base w-full"
                    >
                      <HandCoins className="h-4 w-4 sm:h-5 sm:w-5" />
                      Subscribe to More Shares
                    </button>
                  </Link>
                  <Link
                    to="/board-investment"
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    View Investment Options
                  </Link>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Share subscription (the only investment offered) */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Share subscriptions</h2>
          <p className="text-gray-600">The investment currently open through this site</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-2xl">
          <HandCoins className="h-12 w-12 text-[#6d52a2] mb-4" />
          <p className="text-gray-600 mb-3">
            Eligible investors can subscribe to shares in Citizen Digital Ltd. Share classes, prices, payment
            options and terms are shown in the subscription flow after you sign in.
          </p>
          <p className="text-sm text-gray-600">
            Shares are not deposits. Their value can go down as well as up, and there is no guaranteed return.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      {!user && (
        <section className="bg-white border-y border-gray-200 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start Investing?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Sign in or create a profile to see the share subscription options open to you
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/auth/sign-up"
                className="px-8 py-3 bg-[#6d52a2] text-white rounded-lg font-semibold hover:bg-[#5a4289] transition-colors inline-flex items-center gap-2"
              >
                <DollarSign className="h-5 w-5" />
                Sign up
              </Link>
              <Link
                to="/disclosures"
                className="px-8 py-3 border-2 border-[#6d52a2] text-[#6d52a2] rounded-lg font-semibold hover:bg-[#6d52a2]/10 transition-colors inline-flex items-center gap-2"
              >
                <FileText className="h-5 w-5" />
                View Disclosures
              </Link>
            </div>
          </div>
        </section>
      )}

      <Footer />
      
      {/* Chat Widget - Only show for logged in users */}
      {user && <ChatWidget />}
    </div>
  );
}
