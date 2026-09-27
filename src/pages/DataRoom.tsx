import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserGuardContext } from "app/auth";
import brain from "brain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Download, FolderOpen, Search, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: number;
  category_id: number | null;
  category_name: string | null;
  document_name: string;
  file_size: number | null;
  version: string;
  description: string | null;
  is_required_for_license: boolean;
}

const DataRoom = () => {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Download dialog state
  const [downloadDialog, setDownloadDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [accessReason, setAccessReason] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    checkAccessAndLoadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, selectedCategory, documents]);

  const checkAccessAndLoadDocuments = async () => {
    try {
      // Check if user has access
      const accessResponse = await brain.check_access();
      const accessData = await accessResponse.json();
      
      if (!accessData.has_access) {
        toast.error("You need to complete the agreement process first");
        navigate("/data-room-access");
        return;
      }
      
      // Load documents
      const docsResponse = await brain.list_investor_documents();
      const docsData = await docsResponse.json();
      setDocuments(docsData);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(
        docsData
          .map((doc: Document) => doc.category_name)
          .filter((cat: string | null) => cat !== null)
      )) as string[];
      setCategories(uniqueCategories);
      
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(doc => doc.category_name === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.document_name.toLowerCase().includes(query) ||
        (doc.description?.toLowerCase().includes(query) ?? false) ||
        (doc.category_name?.toLowerCase().includes(query) ?? false)
      );
    }
    
    setFilteredDocs(filtered);
  };

  const handleDownloadClick = (doc: Document) => {
    setSelectedDocument(doc);
    setAccessReason("");
    setDownloadDialog(true);
  };

  const handleDownload = async () => {
    if (!selectedDocument || !accessReason.trim()) {
      toast.error("Please provide a reason for accessing this document");
      return;
    }
    
    setDownloading(true);
    try {
      const response = await brain.access_document(
        { document_id: selectedDocument.id },
        { access_reason: accessReason }
      );
      const data = await response.json();
      
      // Open document in new tab
      window.open(data.file_url, "_blank");
      
      toast.success("Document access logged and opened");
      setDownloadDialog(false);
      setAccessReason("");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to access document");
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const groupedDocuments = filteredDocs.reduce((acc, doc) => {
    const category = doc.category_name || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading data room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <Shield className="h-8 w-8 mr-3 text-primary" />
                Investor Data Room
              </h1>
              <p className="text-muted-foreground">
                Banking License Application Documentation
              </p>
            </div>
            <Button onClick={() => navigate("/my-agreements")} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              My Agreements
            </Button>
          </div>
        </div>

        {/* Compliance Notice */}
        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            All document access is monitored and logged for compliance purposes. Please provide a legitimate business reason when accessing documents.
          </AlertDescription>
        </Alert>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                  size="sm"
                >
                  All Categories
                </Button>
                {categories.map((category) => (
                  <Button 
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    size="sm"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{filteredDocs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Required for License</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {filteredDocs.filter(d => d.is_required_for_license).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{Object.keys(groupedDocuments).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Documents by Category */}
        {Object.entries(groupedDocuments).map(([category, docs]) => (
          <Card key={category} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FolderOpen className="h-5 w-5 mr-2 text-primary" />
                {category}
              </CardTitle>
              <CardDescription>
                {docs.length} document{docs.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {docs.map((doc) => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">{doc.document_name}</h4>
                        {doc.is_required_for_license && (
                          <Badge variant="default">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Required
                          </Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground ml-6">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-muted-foreground">
                        <span>Version: {doc.version}</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleDownloadClick(doc)}
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Access
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDocs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No documents found matching your criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Download Dialog */}
      <Dialog open={downloadDialog} onOpenChange={setDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for accessing this document. All access is logged for compliance.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{selectedDocument.document_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDocument.category_name} • Version {selectedDocument.version}
                </p>
              </div>

              <div>
                <Label htmlFor="access-reason">Access Reason *</Label>
                <Textarea 
                  id="access-reason"
                  placeholder="e.g., Due diligence for investment decision, Legal review, Financial analysis..."
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your access will be logged with timestamp, IP address, and the reason provided.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDownload}
              disabled={!accessReason.trim() || downloading}
            >
              {downloading ? "Processing..." : "Access Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataRoom;
