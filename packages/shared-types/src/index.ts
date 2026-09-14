export type Identifier = string;
export type IsoDateTime = string;
export interface Coordinates { latitude: number; longitude: number }
export interface RequestContext { requestId: string; userId?: Identifier; sessionId?: Identifier }
