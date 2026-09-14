export const iconKeys = [
  'home','search','map','profile','pharmacy','doctor','nursing','medicalSupplies','store','lab','location','phone',
  'directions','clock','duty','rating','add','edit','delete','warning','info','approve','reject','settings',
  'filter','image','logout','lock','refresh','close','chevronLeft','chevronDown'
] as const;
export type IconKey = typeof iconKeys[number];
export const iconRegistry: Record<IconKey, string> = Object.freeze({
  home:'house', search:'search', map:'map', profile:'user-round', pharmacy:'pill', doctor:'stethoscope',
  nursing:'briefcase-medical', medicalSupplies:'activity', store:'store', lab:'flask-conical', location:'map-pin', phone:'phone',
  directions:'navigation', clock:'clock-3', duty:'moon-star', rating:'star', add:'plus', edit:'pencil',
  delete:'trash-2', warning:'triangle-alert', info:'info', approve:'circle-check', reject:'circle-x', settings:'settings',
  filter:'list-filter',image:'image',logout:'log-out',lock:'lock-keyhole',refresh:'refresh-cw',close:'x',chevronLeft:'chevron-left',chevronDown:'chevron-down'
});
