export * from './solita'
export * from './constants'

export function splitId(str: string): [Buffer, Buffer]{
    const bytes = new TextEncoder().encode(str);
  
    const data = new Uint8Array(64);
    data.fill(32);
    data.set(bytes);
    
    return [Buffer.from(data.slice(0, 32)), Buffer.from(data.slice(32))];
}