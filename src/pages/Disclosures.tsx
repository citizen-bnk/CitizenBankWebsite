import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { FileText, Download, Calendar } from "lucide-react";

export default function Disclosures() {
  const disclosures = [
    {
      title: "Annual Financial Report 2024",
      date: "December 31, 2024",
      category: "Financial Reports",
      size: "2.4 MB"
    },
    {
      title: "Q3 2024 Quarterly Report",
      date: "September 30, 2024",
      category: "Financial Reports",
      size: "1.8 MB"
    },
    {
      title: "Corporate Governance Report 2024",
      date: "December 15, 2024",
      category: "Governance",
      size: "1.2 MB"
    },
    {
      title: "Risk Management Framework",
      date: "November 20, 2024",
      category: "Compliance",
      size: "890 KB"
    },
    {
      title: "Sustainability Report 2024",
      date: "October 10, 2024",
      category: "CSR",
      size: "3.1 MB"
    },
    {
      title: "Basel III Compliance Report",
      date: "September 15, 2024",
      category: "Regulatory",
      size: "1.5 MB"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Public Disclosures</h1>
            <p className="text-lg sm:text-xl text-white/90">
              Access our financial reports, compliance documents, and regulatory filings
            </p>
          </div>
        </div>
      </section>

      {/* Disclosures List */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Documents</h2>
          <p className="text-gray-600">Download official reports and disclosures</p>
        </div>

        <div className="space-y-4">
          {disclosures.map((doc, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  <div className="p-3 bg-[#6d52a2]/10 rounded-lg">
                    <FileText className="h-6 w-6 text-[#6d52a2]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{doc.title}</h3>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {doc.date}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">{doc.category}</span>
                      <span>{doc.size}</span>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#6d52a2] text-white rounded-lg hover:bg-[#5a4289] transition-colors">
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
