import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Leaf, Users, Heart, Recycle, GraduationCap, Building } from "lucide-react";

export default function Sustainability() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Sustainability & CSR</h1>
            <p className="text-lg sm:text-xl text-white/90">
              Our commitment to social responsibility, environmental sustainability, and community development
            </p>
          </div>
        </div>
      </section>

      {/* CSR Pillars */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Our CSR Pillars</h2>
          <p className="text-gray-600">Building a better future for Lesotho</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center hover:shadow-lg transition-all">
            <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Environmental Sustainability</h3>
            <p className="text-gray-600">
              Committed to reducing our carbon footprint through green banking practices and sustainable operations
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center hover:shadow-lg transition-all">
            <div className="inline-flex p-4 bg-blue-100 rounded-full mb-4">
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Education Support</h3>
            <p className="text-gray-600">
              Supporting education initiatives and providing scholarships to deserving students across Lesotho
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center hover:shadow-lg transition-all">
            <div className="inline-flex p-4 bg-purple-100 rounded-full mb-4">
              <Users className="h-8 w-8 text-[#6d52a2]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Community Development</h3>
            <p className="text-gray-600">
              Investing in local communities through infrastructure projects and economic empowerment programs
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center hover:shadow-lg transition-all">
            <div className="inline-flex p-4 bg-red-100 rounded-full mb-4">
              <Heart className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Health & Wellness</h3>
            <p className="text-gray-600">
              Promoting health awareness and supporting healthcare facilities to improve public health outcomes
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center hover:shadow-lg transition-all">
            <div className="inline-flex p-4 bg-yellow-100 rounded-full mb-4">
              <Building className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Economic Growth</h3>
            <p className="text-gray-600">
              Supporting SMEs and entrepreneurs to drive economic growth and create employment opportunities
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center hover:shadow-lg transition-all">
            <div className="inline-flex p-4 bg-teal-100 rounded-full mb-4">
              <Recycle className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Responsible Banking</h3>
            <p className="text-gray-600">
              Ethical lending practices and financial inclusion initiatives to serve all segments of society
            </p>
          </div>
        </div>
      </section>

      {/* Impact Numbers */}
      <section className="bg-white border-y border-gray-200 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Our Impact in 2024</h2>
            <p className="text-gray-600">Making a difference in communities across Lesotho</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-[#6d52a2] mb-2">500+</p>
              <p className="text-gray-600">Students Supported</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-[#6d52a2] mb-2">L 5M</p>
              <p className="text-gray-600">Community Investment</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-[#6d52a2] mb-2">15</p>
              <p className="text-gray-600">Infrastructure Projects</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-[#6d52a2] mb-2">10,000+</p>
              <p className="text-gray-600">Lives Impacted</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
