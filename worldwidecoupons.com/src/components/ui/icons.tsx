import {
  Baby,
  BadgeCheck,
  BookOpen,
  Car,
  Clapperboard,
  Clock3,
  Cpu,
  Dumbbell,
  Flame,
  Flower2,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Laptop,
  Music4,
  Palette,
  PawPrint,
  Plane,
  Server,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Category artwork.
 *
 * The imported data stores an emoji per category, which reads as clip-art
 * beside the rest of the interface. Categories are matched on their name
 * instead, so a new one picks up a sensible icon without an editor doing
 * anything, and anything unmatched falls back to a tag.
 */
const CATEGORY_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /jewel|jewl|watch|ring/i, icon: Gem },
  { match: /fashion|accessor|bag|shoe/i, icon: ShoppingBag },
  { match: /cloth|apparel|wear/i, icon: Shirt },
  { match: /book|magazine|cd|media|stationery/i, icon: BookOpen },
  { match: /phone|mobile/i, icon: Smartphone },
  { match: /comput|laptop|software/i, icon: Laptop },
  { match: /electronic|gadget|tech/i, icon: Cpu },
  { match: /host|domain|server|vpn|web/i, icon: Server },
  { match: /food|grocer|restaurant|drink|coffee/i, icon: UtensilsCrossed },
  { match: /travel|flight|hotel|holiday/i, icon: Plane },
  { match: /school|educat|course|learn/i, icon: GraduationCap },
  { match: /beauty|cosmetic|skin|hair/i, icon: Sparkles },
  { match: /movie|entertain|stream|ticket/i, icon: Clapperboard },
  { match: /music|audio/i, icon: Music4 },
  { match: /game|gaming|toy/i, icon: Gamepad2 },
  { match: /furnit|decor|home|kitchen/i, icon: Sofa },
  { match: /garden|plant|flower/i, icon: Flower2 },
  { match: /pet|dog|cat/i, icon: PawPrint },
  { match: /sport|fitness|gym|outdoor/i, icon: Dumbbell },
  { match: /health|pharma|medic/i, icon: Heart },
  { match: /baby|kid|child|mother/i, icon: Baby },
  { match: /auto|car|vehicle|bike/i, icon: Car },
  { match: /art|craft|design|print/i, icon: Palette },
  { match: /gift|card|flowers/i, icon: Gift },
  { match: /financ|bank|insur|money|loan/i, icon: Wallet },
  { match: /real estate|property|househol/i, icon: Home },
];

export function iconForCategory(name: string): LucideIcon {
  return CATEGORY_ICONS.find((entry) => entry.match.test(name))?.icon ?? Tag;
}

export function CategoryIcon({
  name,
  className,
  strokeWidth = 1.9,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = iconForCategory(name);
  return <Icon aria-hidden className={className} strokeWidth={strokeWidth} />;
}

export { BadgeCheck, Clock3, Flame, Tag, type LucideIcon };
