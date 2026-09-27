import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Phone, Clock, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BranchLocator() {
  const branches = [
    {
      name: 'Maseru Main Branch',
      address: 'Kingsway Street, Maseru 100',
      phone: '+266 2231 2345',
      hours: 'Mon-Fri: 8:00 AM - 5:00 PM, Sat: 9:00 AM - 1:00 PM',
      services: ['Full Service', 'ATM', 'Safe Deposit', 'Business Banking'],
      isHeadquarters: true
    },
    {
      name: 'Maseru Mall Branch',
      address: 'Maseru Mall, Pioneer Road, Maseru',
      phone: '+266 2231 5678',
      hours: 'Mon-Fri: 9:00 AM - 5:00 PM, Sat: 9:00 AM - 2:00 PM',
      services: ['Full Service', 'ATM', 'Foreign Exchange'],
      isHeadquarters: false
    },
    {
      name: 'Leribe Branch',
      address: 'Main Street, Leribe',
      phone: '+266 2240 0234',
      hours: 'Mon-Fri: 8:30 AM - 4:30 PM, Sat: 9:00 AM - 12:00 PM',
      services: ['Full Service', 'ATM', 'Loans'],
      isHeadquarters: false
    },
    {
      name: 'Mafeteng Branch',
      address: 'Main Road, Mafeteng',
      phone: '+266 2270 0456',
      hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
      services: ['Full Service', 'ATM'],
      isHeadquarters: false
    },
    {
      name: 'Teyateyaneng Branch',
      address: 'Commercial Street, Teyateyaneng',
      phone: '+266 2250 0789',
      hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
      services: ['Full Service', 'ATM', 'Mobile Banking'],
      isHeadquarters: false
    },
    {
      name: 'Mohale\'s Hoek Branch',
      address: 'Main Road, Mohale\'s Hoek',
      phone: '+266 2278 5012',
      hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
      services: ['Full Service', 'ATM'],
      isHeadquarters: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <MapPin className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">Branch Locator</h1>
            <p className="text-xl text-white/90">
              Find your nearest Citizen Bank branch across the Kingdom of Lesotho
            </p>
          </div>
        </div>
      </section>

      {/* Branch List */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Our Branches</h2>
          <p className="text-gray-600">We have {branches.length} branches across Lesotho to serve you better</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <Card key={branch.name} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {branch.name}
                      {branch.isHeadquarters && (
                        <Badge className="ml-2 bg-[#6d52a2]">Headquarters</Badge>
                      )}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#6d52a2] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-600">{branch.address}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-[#6d52a2] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">{branch.phone}</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-[#6d52a2] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Hours</p>
                    <p className="text-sm text-gray-600">{branch.hours}</p>
                  </div>
                </div>

                {/* Services */}
                <div className="flex items-start gap-3">
                  <Navigation className="h-5 w-5 text-[#6d52a2] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Services</p>
                    <div className="flex flex-wrap gap-2">
                      {branch.services.map((service) => (
                        <Badge key={service} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ATM Information */}
      <section className="bg-white border-t border-gray-200 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">ATM Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-[#6d52a2] mb-2">24/7</div>
                <p className="text-sm text-gray-600">ATM Availability</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#6d52a2] mb-2">15+</div>
                <p className="text-sm text-gray-600">ATM Locations</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#6d52a2] mb-2">Free</div>
                <p className="text-sm text-gray-600">Withdrawals for customers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
