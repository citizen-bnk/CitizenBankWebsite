import { useState, useEffect } from "react";
import { useUserGuardContext } from "app/auth";
import brain from "brain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Users, Link2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { BackOfficeNav } from "components/BackOfficeNav";
import type { 
  UnmappedBoardMember, 
  RegisteredUser, 
  MappingResult,
  AutoSyncResult 
} from "types";

const BackOfficeBoardMapping = () => {
  const { user } = useUserGuardContext();
  const [unmappedMembers, setUnmappedMembers] = useState<UnmappedBoardMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<RegisteredUser[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setAutoSyncing] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [autoSyncResult, setAutoSyncResult] = useState<AutoSyncResult | null>(null);
  const [environment, setEnvironment] = useState<"dev" | "prod">("dev");

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load unmapped board members
      const unmappedResponse = await brain.get_unmapped_board_members({ env: environment });
      const unmappedData = await unmappedResponse.json();
      setUnmappedMembers(unmappedData.unmapped_members || []);

      // Load available users
      const usersResponse = await brain.get_available_users({ env: environment });
      const usersData = await usersResponse.json();
      setAvailableUsers(usersData.users || []);

      console.log(`📊 Loaded ${unmappedData.total_count} unmapped members and ${usersData.total_count} users`);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load mapping data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [environment]);

  const handleManualMapping = async (boardMemberId: number) => {
    const userId = selectedMappings[boardMemberId];
    if (!userId) {
      toast.error("Please select a user to map");
      return;
    }

    try {
      setMapping(true);
      const response = await brain.map_board_member_manually(
        { env: environment },
        { board_member_id: boardMemberId, user_id: userId }
      );
      const result: MappingResult = await response.json();

      if (result.success) {
        toast.success(`Successfully mapped board member to user`);
        // Remove from unmapped list
        setUnmappedMembers(prev => prev.filter(m => m.board_member_id !== boardMemberId));
        // Clear selection
        setSelectedMappings(prev => {
          const newMappings = { ...prev };
          delete newMappings[boardMemberId];
          return newMappings;
        });
      } else {
        toast.error(result.message || "Failed to map board member");
      }
    } catch (error) {
      console.error("Error mapping board member:", error);
      toast.error("Failed to map board member");
    } finally {
      setMapping(false);
    }
  };

  const handleAutoSync = async () => {
    try {
      setAutoSyncing(true);
      setAutoSyncResult(null);
      
      const response = await brain.auto_sync_board_members({ env: environment }, {});
      const result: AutoSyncResult = await response.json();
      
      setAutoSyncResult(result);
      
      if (result.successfully_mapped > 0) {
        toast.success(`Successfully mapped ${result.successfully_mapped} board member(s)`);
        // Reload the unmapped members list
        await loadData();
      } else {
        toast.info("No matching users found for automatic mapping");
      }
    } catch (error) {
      console.error("Error during auto-sync:", error);
      toast.error("Failed to run automatic sync");
    } finally {
      setAutoSyncing(false);
    }
  };

  const handleUserSelection = (boardMemberId: number, userId: string) => {
    setSelectedMappings(prev => ({
      ...prev,
      [boardMemberId]: userId
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <BackOfficeNav currentPage="Board Mapping" />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Board Member to User Mapping</h1>
            <p className="text-muted-foreground">
              Map board members to registered user accounts to enable portal access
            </p>
          </div>

          {/* Environment Selector */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>
                Select which database environment to work with
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <Select value={environment} onValueChange={(val) => setEnvironment(val as "dev" | "prod")}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="prod">Production</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant={environment === "prod" ? "destructive" : "secondary"}>
                  {environment === "prod" ? "⚠️ Production" : "🔧 Development"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Sync Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Automatic Email-Based Sync
              </CardTitle>
              <CardDescription>
                Automatically map board members to users by matching email addresses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={handleAutoSync} 
                  disabled={syncing || unmappedMembers.length === 0}
                  className="w-full sm:w-auto"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Auto-Sync...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Run Auto-Sync Now
                    </>
                  )}
                </Button>

                {autoSyncResult && (
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">Auto-Sync Results:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Total unmapped: {autoSyncResult.total_unmapped}</li>
                          <li className="text-green-600">
                            Successfully mapped: {autoSyncResult.successfully_mapped}
                          </li>
                          <li className="text-red-600">
                            Failed mappings: {autoSyncResult.failed_mappings}
                          </li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Mapping Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Unmapped Board Members ({unmappedMembers.length})
              </CardTitle>
              <CardDescription>
                Manually select and map board members to registered users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unmappedMembers.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">All Board Members Mapped!</p>
                  <p className="text-muted-foreground">
                    All board members are currently mapped to user accounts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unmappedMembers.map((member) => (
                    <div 
                      key={member.board_member_id} 
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{member.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{member.position}</Badge>
                            <Badge variant={member.status === "active" ? "default" : "secondary"}>
                              {member.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Appointed: {new Date(member.appointed_date).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-2 block">
                            Select User to Map
                          </label>
                          <Select
                            value={selectedMappings[member.board_member_id] || ""}
                            onValueChange={(userId) => handleUserSelection(member.board_member_id, userId)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a registered user..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUsers.map((user) => (
                                <SelectItem key={user.user_id} value={user.user_id}>
                                  {user.full_name} - {user.email}
                                  {user.email.toLowerCase() === member.email.toLowerCase() && (
                                    <span className="ml-2 text-green-600">✓ Email Match</span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={() => handleManualMapping(member.board_member_id)}
                          disabled={!selectedMappings[member.board_member_id] || mapping}
                        >
                          {mapping ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Link2 className="mr-2 h-4 w-4" />
                              Map User
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BackOfficeBoardMapping;
