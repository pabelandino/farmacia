export type Settings = {
  company: {
    name: string;
    address: string | null;
    phone: string | null;
    ruc: string | null;
    line1: string | null;
    line2: string | null;
  } | null;
  exchangeRate: number;
  counts: Record<string, number>;
};

export type ImportJob = {
  status: 'idle' | 'running' | 'done' | 'error';
  step: string;
  log: string[];
  error?: string;
  counts?: Record<string, number>;
};
