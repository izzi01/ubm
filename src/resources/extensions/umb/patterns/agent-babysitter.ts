export interface BabysitOptions {
  timeout?: number;
  maxRetries?: number;
  fallbackAgent?: string;
  onRetry?: (attempt: number, error: Error) => void;
  onTimeout?: (attempt: number) => void;
  onFallback?: (agentType: string) => void;
}

export interface DelegateConfig {
  subagent_type?: string;
  category?: string;
  load_skills?: string[];
  prompt: string;
  run_in_background?: boolean;
  [key: string]: unknown;
}

export interface TaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface AgentExecutionAdapter {
  execute(config: DelegateConfig): Promise<unknown>;
}

interface DemoAgentResponse {
  mode: 'adapter-demo';
  config: DelegateConfig;
}

class DemoAgentExecutionAdapter implements AgentExecutionAdapter {
  async execute(config: DelegateConfig): Promise<unknown> {
    const response = {
      mode: 'adapter-demo',
      config: {
        ...config,
        run_in_background: config.run_in_background ?? false
      }
    } satisfies DemoAgentResponse;

    return response;
  }
}

export class AgentTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentTimeoutError';
  }
}

export class AgentMaxRetriesExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentMaxRetriesExceededError';
  }
}

let registeredAdapter: AgentExecutionAdapter = new DemoAgentExecutionAdapter();

export function registerAgentExecutionAdapter(adapter: AgentExecutionAdapter): void {
  registeredAdapter = adapter;
}

export function resetAgentExecutionAdapter(): void {
  registeredAdapter = new DemoAgentExecutionAdapter();
}

export function __setExecuteAgent(impl: (config: DelegateConfig) => Promise<unknown>): void {
  registerAgentExecutionAdapter({ execute: impl });
}

export function __resetExecuteAgent(): void {
  resetAgentExecutionAdapter();
}

export async function babysitAgent<T = unknown>(
  config: DelegateConfig,
  options: BabysitOptions = {}
): Promise<T> {
  const {
    timeout = 120000,
    maxRetries = 2,
    fallbackAgent,
    onRetry,
    onTimeout,
    onFallback
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeWithTimeout<T>(config, timeout, registeredAdapter);
    } catch (error) {
      if (!isTimeoutError(error)) {
        throw error;
      }

      onTimeout?.(attempt);
      console.warn(`Agent timeout on attempt ${attempt}/${maxRetries} (timeout: ${timeout}ms)`);

      if (attempt === maxRetries) {
        if (fallbackAgent) {
          onFallback?.(fallbackAgent);
          console.log(`Using fallback agent: ${fallbackAgent}`);
          return executeFallbackAgent<T>(config, fallbackAgent, registeredAdapter);
        }

        throw error;
      }

      onRetry?.(attempt, error);
    }
  }

  throw new AgentMaxRetriesExceededError(`Agent failed after ${maxRetries} attempts`);
}

async function executeWithTimeout<T>(
  config: DelegateConfig,
  timeoutMs: number,
  adapter: AgentExecutionAdapter
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new AgentTimeoutError(`Agent exceeded timeout of ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return await Promise.race<unknown>([adapter.execute(config), timeoutPromise]) as T;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function executeAgent<T>(config: DelegateConfig): Promise<T> {
  return registeredAdapter.execute(config) as Promise<T>;
}

async function executeFallbackAgent<T>(
  config: DelegateConfig,
  fallbackAgent: string,
  adapter: AgentExecutionAdapter
): Promise<T> {
  return adapter.execute({
    ...config,
    subagent_type: fallbackAgent,
    run_in_background: false
  }) as Promise<T>;
}

function isTimeoutError(error: unknown): error is AgentTimeoutError {
  return error instanceof AgentTimeoutError
    || (error instanceof Error && error.message === 'TIMEOUT')
    || (error instanceof Error && error.name === 'AgentTimeoutError');
}

export function createBabysitter(
  defaultOptions: BabysitOptions
): <T = unknown>(config: DelegateConfig) => Promise<T> {
  return <T = unknown>(config: DelegateConfig) => babysitAgent<T>(config, defaultOptions);
}
