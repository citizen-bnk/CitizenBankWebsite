import { LucideIcon } from "lucide-react";
import { Link } from "./EcosystemLink";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
  color?: string;
}

export function PortalCard({ icon: Icon, title, description, link, color = "#6d52a2" }: Props) {
  return (
    <Link
      to={link}
      className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-[#6d52a2] transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-[#6d52a2]/10 group-hover:bg-[#6d52a2]/20 transition-colors">
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#6d52a2] transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </Link>
  );
}
