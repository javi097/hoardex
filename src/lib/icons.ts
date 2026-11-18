import { createElement } from 'react';
import {
  Gamepad2,
  BookOpen,
  Dice5,
  Trophy,
  Disc3,
  LayoutGrid,
  Film,
  Music,
  Camera,
  Star,
  Heart,
  Package,
  Tv,
  Headphones,
  Shirt,
  Brush,
  Coffee,
  Zap,
  Globe,
  Archive,
  Tag,
  Bookmark,
  Gift,
  Puzzle,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Gamepad2,
  BookOpen,
  Dice5,
  Trophy,
  Disc3,
  LayoutGrid,
  Film,
  Music,
  Camera,
  Star,
  Heart,
  Package,
  Tv,
  Headphones,
  Shirt,
  Brush,
  Coffee,
  Zap,
  Globe,
  Archive,
  Tag,
  Bookmark,
  Gift,
  Puzzle,
};

export function getIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? LayoutGrid;
}

export function CollectionIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Icon = ICON_REGISTRY[name] ?? LayoutGrid;
  return createElement(Icon, props);
}
