import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Rocket, Calendar } from 'lucide-react';

export interface Props {
  open: boolean;
  onClose: () => void;
  platform?: string;
}

export function ComingSoonModal({ open, onClose, platform = 'social media' }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#6d52a2]">
            <Rocket className="h-5 w-5" />
            Coming Soon!
          </DialogTitle>
          <DialogDescription className="pt-4">
            <div className="text-center space-y-4">
              <div className="p-4 bg-[#6d52a2]/10 rounded-lg">
                <Calendar className="h-12 w-12 text-[#6d52a2] mx-auto mb-3" />
                <p className="text-gray-700 font-medium">
                  We're working on our {platform} presence!
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Our social media channels will be launching soon. Stay tuned for updates, news, and exclusive content from Citizen Bank.
              </p>
              <p className="text-xs text-gray-500">
                In the meantime, you can contact us through our website or visit any of our branches.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
