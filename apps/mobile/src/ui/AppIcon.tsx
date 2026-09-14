import React from 'react';
import type { IconKey } from '@health/icon-registry';
import { semanticColors } from '@health/design-tokens';
import {
  Activity, BriefcaseMedical, ChevronDown, ChevronLeft, CircleCheck, CircleX, Clock3, House, Image,
  Info, ListFilter, LockKeyhole, LogOut, Map, MapPin, MoonStar, Navigation, Pencil, Phone, Pill, Plus,
  RefreshCw, Search, Settings, Star, Stethoscope, Trash2, TriangleAlert, UserRound, X, Store, FlaskConical,
  type LucideIcon,
} from 'lucide-react-native';
const registry:Record<IconKey,LucideIcon>={home:House,search:Search,map:Map,profile:UserRound,pharmacy:Pill,doctor:Stethoscope,nursing:BriefcaseMedical,medicalSupplies:Activity,store:Store,lab:FlaskConical,location:MapPin,phone:Phone,directions:Navigation,clock:Clock3,duty:MoonStar,rating:Star,add:Plus,edit:Pencil,delete:Trash2,warning:TriangleAlert,info:Info,approve:CircleCheck,reject:CircleX,settings:Settings,filter:ListFilter,image:Image,logout:LogOut,lock:LockKeyhole,refresh:RefreshCw,close:X,chevronLeft:ChevronLeft,chevronDown:ChevronDown};
export function AppIcon({name,size=22,color=semanticColors.textSecondary}:{name:IconKey;size?:number;color?:string}){const Icon=registry[name];return <Icon size={size} color={color} strokeWidth={2}/>}
