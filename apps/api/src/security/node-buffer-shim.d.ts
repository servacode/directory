declare class Buffer extends Uint8Array {
  static from(data: readonly number[] | string, encoding?: string): Buffer;
  static alloc(size: number): Buffer;
  static concat(list: readonly Buffer[]): Buffer;
  readonly length: number;
  readonly [index: number]: number;
  subarray(start?: number, end?: number): Buffer;
  equals(other: Uint8Array): boolean;
  toString(encoding?: string, start?: number, end?: number): string;
  readUInt16BE(offset: number): number;
  readUInt32BE(offset: number): number;
  readUInt32LE(offset: number): number;
  write(value: string, offset?: number, encoding?: string): number;
  writeUInt32LE(value: number, offset: number): number;
}
