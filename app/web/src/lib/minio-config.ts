export type ParsedMinioEndpoint = {
  endPoint: string;
  port: number;
};

export function parseMinioEndpoint(
  endpoint: string | undefined,
  portValue: string | undefined,
): ParsedMinioEndpoint {
  const fallbackPort = 9000;
  const rawEndpoint = endpoint || 'localhost';
  const parsedPort = parseInt(portValue || `${fallbackPort}`, 10);

  if (rawEndpoint.includes(':')) {
    const [host, rawPort] = rawEndpoint.split(':');
    return {
      endPoint: host || 'localhost',
      port: parseInt(rawPort || `${fallbackPort}`, 10) || fallbackPort,
    };
  }

  return {
    endPoint: rawEndpoint,
    port: Number.isNaN(parsedPort) ? fallbackPort : parsedPort,
  };
}
