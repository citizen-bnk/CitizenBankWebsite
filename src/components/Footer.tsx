import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { ComingSoonModal } from 'components/ComingSoonModal';
import { useState } from 'react';
import { bankingDestination, hubDestination } from 'utils/bankingDestination';

export function Footer() {
  const logoUrl = "/brand/logo.png";
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [platform, setPlatform] = useState('');

  const handleSocialClick = (socialPlatform: string) => {
    setPlatform(socialPlatform);
    setShowComingSoon(true);
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* About */}
          <div className="lg:col-span-1">
            <img src={logoUrl} alt="Citizen Bank" className="h-10 w-auto mb-4 brightness-0 invert" />
            <p className="text-sm text-gray-400">
              Your trusted financial partner in the Kingdom of Lesotho.
            </p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => handleSocialClick('Facebook')} className="text-gray-400 hover:text-[#8f6ec4] transition-colors">
                <Facebook className="h-5 w-5" />
              </button>
              <button onClick={() => handleSocialClick('Twitter')} className="text-gray-400 hover:text-[#8f6ec4] transition-colors">
                <Twitter className="h-5 w-5" />
              </button>
              <button onClick={() => handleSocialClick('LinkedIn')} className="text-gray-400 hover:text-[#8f6ec4] transition-colors">
                <Linkedin className="h-5 w-5" />
              </button>
              <button onClick={() => handleSocialClick('Instagram')} className="text-gray-400 hover:text-[#8f6ec4] transition-colors">
                <Instagram className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Banking Services */}
          <div>
            <h3 className="text-white font-semibold mb-4">Banking</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href={bankingDestination('/login')} className="hover:text-[#8f6ec4] transition-colors">Internet Banking</a></li>
              <li><a href={bankingDestination('/register')} className="hover:text-[#8f6ec4] transition-colors">Open a demo account</a></li>
              <li><a href={bankingDestination('/login')} className="hover:text-[#8f6ec4] transition-colors">Cards and accounts</a></li>
            </ul>
          </div>

          {/* Investment */}
          <div>
            <h3 className="text-white font-semibold mb-4">Investment</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href={hubDestination('/opportunities')} className="hover:text-[#8f6ec4] transition-colors">Investment Opportunities</a></li>
              <li><a href={hubDestination('/login')} className="hover:text-[#8f6ec4] transition-colors">Investor Portal</a></li>
              <li><Link to="/disclosures" className="hover:text-[#8f6ec4] transition-colors">Public Disclosures</Link></li>
              <li><Link to="/media" className="hover:text-[#8f6ec4] transition-colors">Company Updates</Link></li>
            </ul>
          </div>

          {/* About & Media */}
          <div>
            <h3 className="text-white font-semibold mb-4">About</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-[#8f6ec4] transition-colors">About Us</Link></li>
              <li><a href={hubDestination('/login')} className="hover:text-[#8f6ec4] transition-colors">Board Login</a></li>
              <li><Link to="/media" className="hover:text-[#8f6ec4] transition-colors">Media Center</Link></li>
              <li><Link to="/careers" className="hover:text-[#8f6ec4] transition-colors">Careers</Link></li>
              <li><Link to="/sustainability" className="hover:text-[#8f6ec4] transition-colors">Sustainability</Link></li>
              <li><Link to="/contact" className="hover:text-[#8f6ec4] transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/help-center" className="hover:text-[#8f6ec4] transition-colors">Help Center</Link></li>
              <li><Link to="/contact" className="hover:text-[#8f6ec4] transition-colors">Contact Us</Link></li>
              <li><Link to="/branch-locator" className="hover:text-[#8f6ec4] transition-colors">Branch Locator</Link></li>
              <li><Link to="/security-tips" className="hover:text-[#8f6ec4] transition-colors">Security Tips</Link></li>
              <li><Link to="/faqs" className="hover:text-[#8f6ec4] transition-colors">FAQs</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Citizen Digital Ltd. Banking licence application in preparation.</p>
            <div className="flex gap-6">
              <Link to="/privacy-policy" className="hover:text-[#8f6ec4] transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-[#8f6ec4] transition-colors">Terms of Service</Link>
              <Link to="/cookie-policy" className="hover:text-[#8f6ec4] transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>

      <ComingSoonModal 
        open={showComingSoon} 
        onClose={() => setShowComingSoon(false)} 
        platform={platform}
      />
    </footer>
  );
}
