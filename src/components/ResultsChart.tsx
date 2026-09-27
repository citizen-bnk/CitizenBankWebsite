import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle, XCircle, MinusCircle, TrendingUp } from 'lucide-react';

export interface VoteResultItem {
  item_id: number | null;
  question?: string;
  results: Record<string, {
    count: number;
    voting_power: number;
  }>;
}

export interface ResultsChartProps {
  session: {
    id: number;
    title: string;
    session_type: string;
    status: string;
  };
  totalPossibleVotingPower: number;
  results: VoteResultItem[];
  showVotingPower?: boolean; // True for AGM (shares), false for board (1 vote each)
}

const COLORS = {
  for: '#10b981',
  against: '#ef4444',
  abstain: '#6b7280',
  approve: '#10b981',
  reject: '#ef4444',
  attending: '#10b981',
  not_attending: '#ef4444',
  tentative: '#f59e0b'
};

export function ResultsChart({ 
  session, 
  totalPossibleVotingPower, 
  results,
  showVotingPower = true 
}: ResultsChartProps) {
  
  const getVoteIcon = (voteType: string) => {
    if (voteType.includes('for') || voteType.includes('approve') || voteType.includes('attending')) {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (voteType.includes('against') || voteType.includes('reject') || voteType.includes('not_attending')) {
      return <XCircle className="h-4 w-4" />;
    }
    return <MinusCircle className="h-4 w-4" />;
  };

  const getOutcome = (resultItem: VoteResultItem): { outcome: string; color: string } => {
    const { results: votes } = resultItem;
    
    const forVotes = votes.for?.voting_power || votes.approve?.voting_power || 0;
    const againstVotes = votes.against?.voting_power || votes.reject?.voting_power || 0;
    
    if (forVotes > againstVotes) {
      return { outcome: 'APPROVED', color: 'bg-green-600' };
    } else if (againstVotes > forVotes) {
      return { outcome: 'REJECTED', color: 'bg-red-600' };
    } else {
      return { outcome: 'TIED', color: 'bg-amber-600' };
    }
  };

  const calculateParticipation = (resultItem: VoteResultItem): number => {
    const totalVotesPower = Object.values(resultItem.results)
      .reduce((sum, r) => sum + r.voting_power, 0);
    return totalPossibleVotingPower > 0 
      ? (totalVotesPower / totalPossibleVotingPower) * 100 
      : 0;
  };

  const prepareChartData = (resultItem: VoteResultItem) => {
    return Object.entries(resultItem.results).map(([voteType, data]) => ({
      name: voteType.charAt(0).toUpperCase() + voteType.slice(1),
      votes: data.count,
      votingPower: data.voting_power,
      fill: COLORS[voteType as keyof typeof COLORS] || '#9ca3af'
    }));
  };

  const preparePieData = (resultItem: VoteResultItem) => {
    return Object.entries(resultItem.results).map(([voteType, data]) => ({
      name: voteType.charAt(0).toUpperCase() + voteType.slice(1),
      value: showVotingPower ? data.voting_power : data.count,
      fill: COLORS[voteType as keyof typeof COLORS] || '#9ca3af'
    }));
  };

  const renderResultItem = (resultItem: VoteResultItem, index: number) => {
    const chartData = prepareChartData(resultItem);
    const pieData = preparePieData(resultItem);
    const { outcome, color } = getOutcome(resultItem);
    const participation = calculateParticipation(resultItem);

    return (
      <Card key={resultItem.item_id || 0}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">
                {resultItem.question || `Question ${index + 1}`}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${color} text-white`}>
                  {outcome}
                </Badge>
                <Badge variant="outline">
                  {participation.toFixed(1)}% Participation
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {chartData.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-2xl font-bold">
                  {showVotingPower ? item.votingPower.toLocaleString() : item.votes}
                </div>
                <div className="text-xs text-muted-foreground">
                  {showVotingPower ? `${item.votes} votes` : 'votes'}
                </div>
              </div>
            ))}
          </div>

          {/* Participation Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Participation</span>
              <span className="font-medium">
                {Object.values(resultItem.results).reduce((sum, r) => sum + r.voting_power, 0).toLocaleString()}
                {' / '}
                {totalPossibleVotingPower.toLocaleString()}
                {showVotingPower ? ' shares' : ' votes'}
              </span>
            </div>
            <Progress value={participation} className="h-2" />
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3">Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey={showVotingPower ? 'votingPower' : 'votes'} 
                    radius={[8, 8, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3">Breakdown</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{session.title}</CardTitle>
              <CardDescription className="mt-1">
                {session.session_type.replace('_', ' ').toUpperCase()} Results
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
              <TrendingUp className="h-3 w-3 mr-1" />
              Final Results
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Eligible</div>
              <div className="text-2xl font-bold">
                {totalPossibleVotingPower.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {showVotingPower ? 'shares' : 'votes'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Questions/Items</div>
              <div className="text-2xl font-bold">
                {results.length || 1}
              </div>
              <div className="text-xs text-muted-foreground">
                {results.length === 1 ? 'item' : 'items'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="text-2xl font-bold capitalize">
                {session.status}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Results */}
      {results.length > 0 ? (
        results.map((result, index) => renderResultItem(result, index))
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No voting results available yet</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
