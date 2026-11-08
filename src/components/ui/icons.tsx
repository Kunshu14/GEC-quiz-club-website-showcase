import React from "react";
import {
  Trophy,
  Bell,
  Zap,
  FileSpreadsheet,
  Download,
  Upload,
  GraduationCap,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Medal,
  User,
  Users,
  Settings,
  Presentation,
  Lightbulb,
  Paperclip,
  Calendar,
  Search,
  Globe,
  Film,
  Tv,
  Clapperboard,
  Landmark,
  Scale,
  Compass,
  Atom,
  Cpu,
  BookOpen,
  Palette,
  Flame,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Save,
  Copy,
  FolderUp,
  FileText,
  Target,
  Sparkles,
  Crown,
  Mic,
  Image as LucideImage,
  Ticket,
  RotateCw,
  MapPin,
  Coins,
  Maximize2,
} from "lucide-react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}

const defaultProps = {
  strokeWidth: 2.5,
  className: "inline-block shrink-0",
};

export const TrophyIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Trophy size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const BellIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Bell size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const ZapIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Zap size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const SpreadsheetIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <FileSpreadsheet size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const DownloadIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Download size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const UploadIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Upload size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const GraduationCapIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <GraduationCap size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const PencilIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Pencil size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const TrashIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Trash2 size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const CheckIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Check size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const XIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <X size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const AlertTriangleIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <AlertTriangle size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const MedalIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Medal size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const UserIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <User size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const UsersIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Users size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const SettingsIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Settings size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const PresentationIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Presentation size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const LightbulbIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Lightbulb size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const PaperclipIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Paperclip size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const CalendarIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Calendar size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const SearchIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Search size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const TargetIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Target size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const SaveIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Save size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const CopyIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Copy size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const ExternalLinkIcon = ({ size = 14, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <ExternalLink size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const CheckCircleIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <CheckCircle2 size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const SparklesIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Sparkles size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const CrownIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Crown size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const MicIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Mic size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const ImageIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <LucideImage size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const TicketIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Ticket size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const FlameIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Flame size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const RefreshIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <RotateCw size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const GlobeIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Globe size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const FileTextIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <FileText size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const MapPinIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <MapPin size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const CoinsIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Coins size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const MaximizeIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <Maximize2 size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

export const BookOpenIcon = ({ size = 16, className = "", strokeWidth = 2.5, ...props }: IconProps) => (
  <BookOpen size={size} strokeWidth={strokeWidth} className={`${defaultProps.className} ${className}`} {...props} />
);

/**
 * Maps a category name to a clean, flat-color vector icon per Section 3.7.
 */
export function getCategoryIcon(categoryName: string, size = 15): React.ReactNode {
  const norm = categoryName.toLowerCase().trim();
  if (norm.includes("pop") || norm.includes("culture")) return <SparklesIcon size={size} />;
  if (norm.includes("movie") || norm.includes("cinema")) return <Clapperboard size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
  if (norm.includes("entertainment")) return <Tv size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
  if (norm.includes("history")) return <Landmark size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
  if (norm.includes("politics") || norm.includes("law")) return <Scale size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
  if (norm.includes("geo") || norm.includes("world")) return <Compass size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
  if (norm.includes("science")) return <Atom size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
  if (norm.includes("tech")) return <Cpu size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
  if (norm.includes("lit") || norm.includes("book")) return <BookOpen size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
  if (norm.includes("art")) return <Palette size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
  if (norm.includes("sport")) return <TrophyIcon size={size} />;
  return <HelpCircle size={size} strokeWidth={2.5} className="inline-block shrink-0" />;
}
