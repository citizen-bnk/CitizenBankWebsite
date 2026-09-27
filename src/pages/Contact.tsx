import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setSubmitting(false);
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      details: ['+266 2231 2345', '+266 2231 2346 (Toll-free)']
    },
    {
      icon: Mail,
      title: 'Email',
      details: ['info@citizenbank.co.ls', 'support@citizenbank.co.ls']
    },
    {
      icon: MapPin,
      title: 'Head Office',
      details: ['Kingsway Street', 'Maseru 100, Lesotho']
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: ['Monday - Friday: 8:00 AM - 5:00 PM', 'Saturday: 9:00 AM - 1:00 PM']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-lg sm:text-xl text-white/90">
              Get in touch with our team. We're here to help with any questions or concerns.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+266 xxxx xxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Select
                        required
                        value={formData.subject}
                        onValueChange={(value) => setFormData({ ...formData, subject: value })}
                      >
                        <SelectTrigger id="subject">
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="account">Account Support</SelectItem>
                          <SelectItem value="loan">Loan Information</SelectItem>
                          <SelectItem value="investment">Investment Inquiry</SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#6d52a2] hover:bg-[#5a4289]"
                    disabled={submitting}
                  >
                    {submitting ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {contactInfo.map((info) => {
              const Icon = info.icon;
              return (
                <Card key={info.title}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#6d52a2]/10">
                        <Icon className="h-5 w-5 text-[#6d52a2]" />
                      </div>
                      <CardTitle className="text-lg">{info.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {info.details.map((detail, index) => (
                      <p key={index} className="text-sm text-gray-600">
                        {detail}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              );
            })}

            {/* Emergency Contact */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 text-lg">Emergency Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-800 mb-2">For urgent account issues or card blocking:</p>
                <p className="text-lg font-bold text-red-900">+266 2231 9999</p>
                <p className="text-xs text-red-700 mt-1">Available 24/7</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
