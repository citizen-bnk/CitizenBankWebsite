import { Header } from "components/Header";
import { Footer } from "components/Footer";

export function ProfileLoadingState() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Loading profile...</p>
      </div>
      <Footer />
    </div>
  );
}
