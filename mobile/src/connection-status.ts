export type ConnectionStatus = 'online' | 'offline' | 'unavailable';
/** A successful store response is stronger evidence than OS connectivity flags. */
export function connectionStatus(reachable: boolean, connected?: boolean): ConnectionStatus {
  return reachable ? 'online' : connected === false ? 'offline' : 'unavailable';
}
