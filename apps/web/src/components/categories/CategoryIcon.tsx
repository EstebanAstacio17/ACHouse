import React from "react";
import {
  Banknote,
  Building,
  Building2,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  ShoppingCart,
  ShoppingBag,
  Home,
  Zap,
  Car,
  HeartPulse,
  Heart,
  Film,
  GraduationCap,
  Tag,
  Wallet,
  CreditCard,
  PiggyBank,
  Coins,
  DollarSign,
  Receipt,
  Utensils,
  Coffee,
  Fuel,
  Plane,
  Bus,
  Train,
  Bike,
  Gift,
  Briefcase,
  Laptop,
  Smartphone,
  Tv,
  Wifi,
  Phone,
  Droplet,
  Lightbulb,
  Hammer,
  Wrench,
  Shield,
  ShieldCheck,
  Stethoscope,
  Pill,
  Dumbbell,
  Book,
  BookOpen,
  Music,
  Gamepad2,
  Smile,
  Baby,
  Dog,
  Cat,
  Scissors,
  Shirt,
  Sparkles,
  Calendar,
  Clock,
  Package,
  Truck,
  Beer,
  Wine,
  Apple,
  Pizza,
  Landmark,
  Users,
  User,
  Folder,
  Layers,
  LucideIcon,
} from "lucide-react";

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Finanzas / Ingresos
  "banknote": Banknote,
  "wallet": Wallet,
  "credit-card": CreditCard,
  "creditcard": CreditCard,
  "piggy-bank": PiggyBank,
  "piggybank": PiggyBank,
  "coins": Coins,
  "dollar-sign": DollarSign,
  "dollarsign": DollarSign,
  "receipt": Receipt,
  "landmark": Landmark,
  "trending-up": TrendingUp,
  "trendingup": TrendingUp,
  "trending-down": TrendingDown,
  "trendingdown": TrendingDown,
  "plus-circle": PlusCircle,
  "pluscircle": PlusCircle,

  // Negocios / Trabajo
  "building": Building,
  "building-2": Building2,
  "building2": Building2,
  "briefcase": Briefcase,
  "laptop": Laptop,
  "smartphone": Smartphone,
  "folder": Folder,
  "layers": Layers,

  // Gastos del hogar / Compras
  "shopping-cart": ShoppingCart,
  "shoppingcart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  "shoppingbag": ShoppingBag,
  "home": Home,
  "zap": Zap,
  "droplet": Droplet,
  "lightbulb": Lightbulb,
  "wifi": Wifi,
  "phone": Phone,
  "hammer": Hammer,
  "wrench": Wrench,
  "package": Package,

  // Transporte / Viajes
  "car": Car,
  "fuel": Fuel,
  "plane": Plane,
  "bus": Bus,
  "train": Train,
  "bike": Bike,
  "truck": Truck,

  // Salud / Cuidado personal
  "heart-pulse": HeartPulse,
  "heartpulse": HeartPulse,
  "heart": Heart,
  "stethoscope": Stethoscope,
  "pill": Pill,
  "pills": Pill,
  "dumbbell": Dumbbell,
  "shield": Shield,
  "shield-check": ShieldCheck,
  "shieldcheck": ShieldCheck,

  // Ocio / Educación / Otros
  "film": Film,
  "graduation-cap": GraduationCap,
  "graduationcap": GraduationCap,
  "book": Book,
  "book-open": BookOpen,
  "bookopen": BookOpen,
  "music": Music,
  "gamepad-2": Gamepad2,
  "gamepad2": Gamepad2,
  "tv": Tv,
  "smile": Smile,
  "baby": Baby,
  "dog": Dog,
  "cat": Cat,
  "scissors": Scissors,
  "shirt": Shirt,
  "gift": Gift,
  "sparkles": Sparkles,
  "calendar": Calendar,
  "clock": Clock,

  // Comida / Bebida
  "utensils": Utensils,
  "coffee": Coffee,
  "pizza": Pizza,
  "apple": Apple,
  "beer": Beer,
  "wine": Wine,

  // Personas / General
  "users": Users,
  "user": User,
  "tag": Tag,
};

export const POPULAR_CATEGORY_ICONS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "banknote", label: "Salario", icon: Banknote },
  { id: "trending-up", label: "Inversión", icon: TrendingUp },
  { id: "building", label: "Negocio", icon: Building },
  { id: "plus-circle", label: "Otros Ingresos", icon: PlusCircle },
  { id: "shopping-cart", label: "Supermercado", icon: ShoppingCart },
  { id: "home", label: "Vivienda", icon: Home },
  { id: "zap", label: "Servicios", icon: Zap },
  { id: "car", label: "Transporte", icon: Car },
  { id: "heart-pulse", label: "Salud", icon: HeartPulse },
  { id: "graduation-cap", label: "Educación", icon: GraduationCap },
  { id: "film", label: "Entretenimiento", icon: Film },
  { id: "utensils", label: "Comida", icon: Utensils },
  { id: "coffee", label: "Café", icon: Coffee },
  { id: "tag", label: "General", icon: Tag },
  { id: "wallet", label: "Billetera", icon: Wallet },
  { id: "credit-card", label: "Tarjeta", icon: CreditCard },
  { id: "gift", label: "Regalos", icon: Gift },
  { id: "plane", label: "Viajes", icon: Plane },
  { id: "dumbbell", label: "Deporte", icon: Dumbbell },
  { id: "book", label: "Lectura", icon: Book },
];

function isEmoji(str: string): boolean {
  if (!str) return false;
  return /\p{Extended_Pictographic}/u.test(str);
}

export interface CategoryIconProps {
  icon?: string | null;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export function CategoryIcon({
  icon,
  size = 18,
  color,
  className,
  strokeWidth = 2,
}: CategoryIconProps) {
  if (!icon || !icon.trim()) {
    return <Tag size={size} color={color} strokeWidth={strokeWidth} className={className} />;
  }

  const raw = icon.trim();

  // If it's an emoji (e.g. 🛒, 🏠, 🏷️)
  if (isEmoji(raw)) {
    return (
      <span
        role="img"
        aria-label="ícono de categoría"
        className={className}
        style={{
          fontSize: `${size}px`,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
        }}
      >
        {raw}
      </span>
    );
  }

  // Normalize kebab/snake/spaces/pascal
  const normalizedKey = raw
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  const IconComponent =
    CATEGORY_ICON_MAP[normalizedKey] ||
    CATEGORY_ICON_MAP[normalizedKey.replace(/-/g, "")];

  if (IconComponent) {
    return (
      <IconComponent
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
      />
    );
  }

  // Fallback if unrecognized
  return <Tag size={size} color={color} strokeWidth={strokeWidth} className={className} />;
}
