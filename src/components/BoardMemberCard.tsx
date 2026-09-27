import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Briefcase as BriefcaseIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ReadOnlyFieldComponent } from "components/ReadOnlyFieldComponent";

type BoardMemberData = {
  position: string;
  appointed_date: string;
  term_end_date?: string;
  total_shares?: number;
  status: string;
};

type Props = {
  boardData: BoardMemberData;
};

export const BoardMemberCard = ({ boardData }: Props) => {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="h-5 w-5 text-primary" />
          <CardTitle>Board Member</CardTitle>
        </div>
        <CardDescription>Your board membership details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ReadOnlyFieldComponent label="Position" value={boardData.position} />
        <Separator />
        <ReadOnlyFieldComponent 
          label="Appointed Date" 
          value={boardData.appointed_date ? format(new Date(boardData.appointed_date), 'PPP') : null} 
        />
        {boardData.term_end_date && (
          <>
            <Separator />
            <ReadOnlyFieldComponent 
              label="Term End Date" 
              value={format(new Date(boardData.term_end_date), 'PPP')} 
            />
          </>
        )}
        <Separator />
        <ReadOnlyFieldComponent 
          label="Total Shares" 
          value={boardData.total_shares?.toLocaleString() || '0'} 
        />
        <Separator />
        <div>
          <p className="text-sm font-medium text-gray-500">Board Status</p>
          <Badge 
            variant={boardData.status === 'active' ? 'default' : 'secondary'}
            className="mt-1 capitalize"
          >
            {boardData.status}
          </Badge>
        </div>
        <Separator />
        <Button 
          onClick={() => navigate('/board-portal')} 
          className="w-full"
          variant="outline"
        >
          Go to Board Portal
        </Button>
      </CardContent>
    </Card>
  );
};
