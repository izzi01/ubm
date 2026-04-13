export enum TaskStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
  FAILED = 'failed'
}

export interface DelegateConfig {
  category?: string;
  subagent_type?: string;
  load_skills?: string[];
  prompt: string;
  run_in_background?: boolean;
  session_id?: string;
  [key: string]: unknown;
}

export interface TaskMetadata {
  id: string;
  status: TaskStatus;
  startTime: number;
  timeout?: number;
  config: DelegateConfig;
  endTime?: number;
  error?: Error;
}

export interface SpawnOptions {
  timeout?: number;
}

export interface CollectOptions {
  timeout?: number;
}

export interface CollectResult<T> {
  taskId: string;
  status: TaskStatus;
  data?: T;
  error?: Error;
}

export interface BackgroundSpawnResult {
  taskId?: string;
}

export interface BackgroundCollectEnvelope<T = unknown> {
  status?: TaskStatus;
  data?: T;
  error?: Error;
}

export interface BackgroundManagerExecutors {
  spawn?: (
    config: DelegateConfig,
    context: SpawnOptions & { proposedTaskId: string }
  ) => Promise<BackgroundSpawnResult | void>;
  collect?: (
    task: TaskMetadata,
    options?: CollectOptions
  ) => Promise<BackgroundCollectEnvelope | unknown>;
  cancel?: (task: TaskMetadata, status: TaskStatus) => Promise<void>;
}

interface DemoBackgroundCollectData {
  mode: 'adapter-demo';
  taskId: string;
  prompt: string;
  run_in_background: boolean;
}

interface InternalTaskMetadata extends TaskMetadata {
  timeoutHandle?: ReturnType<typeof setTimeout>;
  lastResult?: unknown;
}

const defaultExecutors: Required<BackgroundManagerExecutors> = {
  async spawn(_config, context): Promise<BackgroundSpawnResult> {
    return { taskId: context.proposedTaskId };
  },
  async collect<T>(task: TaskMetadata): Promise<BackgroundCollectEnvelope<T>> {
    const data = {
      mode: 'adapter-demo',
      taskId: task.id,
      prompt: task.config.prompt,
      run_in_background: task.config.run_in_background === true
    } satisfies DemoBackgroundCollectData;

    return {
      status: TaskStatus.COMPLETED,
      data: data as T
    };
  },
  async cancel(): Promise<void> {
    return Promise.resolve();
  }
};

export class BackgroundManager {
  private readonly tasks = new Map<string, InternalTaskMetadata>();
  private readonly DEFAULT_TIMEOUT = 120000;
  private executors: Required<BackgroundManagerExecutors>;

  constructor(executors: BackgroundManagerExecutors = {}) {
    this.executors = {
      ...defaultExecutors,
      ...executors
    };
  }

  registerExecutors(executors: BackgroundManagerExecutors): void {
    this.executors = {
      ...this.executors,
      ...executors
    };
  }

  async spawn<T = unknown>(
    config: DelegateConfig,
    options: SpawnOptions = {}
  ): Promise<string> {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be a valid object');
    }

    if (!config.prompt || typeof config.prompt !== 'string') {
      throw new Error('Config must include a valid prompt string');
    }

    const spawnConfig: DelegateConfig = {
      ...config,
      run_in_background: true
    };

    const timeoutMs = options.timeout ?? this.DEFAULT_TIMEOUT;
    const proposedTaskId = this.generateTaskId();
    const spawnResult = await this.executors.spawn(spawnConfig, {
      ...options,
      timeout: timeoutMs,
      proposedTaskId
    });
    const taskId = spawnResult?.taskId ?? proposedTaskId;

    const metadata: InternalTaskMetadata = {
      id: taskId,
      status: TaskStatus.RUNNING,
      startTime: Date.now(),
      timeout: timeoutMs,
      config: spawnConfig
    };

    metadata.timeoutHandle = setTimeout(() => {
      const task = this.tasks.get(taskId);
      if (task && task.status === TaskStatus.RUNNING) {
        void this.cancelTask(taskId, TaskStatus.TIMEOUT);
      }
    }, timeoutMs);

    this.tasks.set(taskId, metadata);
    return taskId;
  }

  async collect<T = unknown>(
    taskId: string,
    options?: CollectOptions
  ): Promise<CollectResult<T>> {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === TaskStatus.CANCELLED) {
      throw new Error(`Task ${taskId} was cancelled`);
    }

    if (task.status === TaskStatus.TIMEOUT) {
      throw new Error(`Task ${taskId} timed out`);
    }

    if (task.status === TaskStatus.COMPLETED) {
      return {
        taskId,
        status: task.status,
        data: task.lastResult as T
      };
    }

    const rawResult = await this.executors.collect(task, options);
    const normalized = this.normalizeCollectResult<T>(rawResult);

    task.status = normalized.error ? TaskStatus.FAILED : (normalized.status ?? TaskStatus.COMPLETED);
    task.endTime = Date.now();
    task.error = normalized.error;
    task.lastResult = normalized.data;
    this.clearTaskTimeout(task);

    return {
      taskId,
      status: task.status,
      data: normalized.data,
      error: normalized.error
    };
  }

  async cleanup(): Promise<void> {
    const runningTasks = this.getRunning();

    await Promise.all(runningTasks.map((task) => this.cancelTask(task.id)));

    if (runningTasks.length > 0) {
      console.log(`Cancelled ${runningTasks.length} running tasks`);
    }

    this.tasks.clear();
  }

  getRunning(): TaskMetadata[] {
    return Array.from(this.tasks.values()).filter((task) => task.status === TaskStatus.RUNNING);
  }

  getAllTasks(): TaskMetadata[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): TaskMetadata | undefined {
    return this.tasks.get(taskId);
  }

  async cancelTask(
    taskId: string,
    status: TaskStatus = TaskStatus.CANCELLED
  ): Promise<void> {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== TaskStatus.RUNNING) {
      console.warn(`Task ${taskId} is not running (status: ${task.status})`);
      return;
    }

    await this.executors.cancel(task, status);

    task.status = status;
    task.endTime = Date.now();
    this.clearTaskTimeout(task);
  }

  getStats(): {
    total: number;
    running: number;
    completed: number;
    cancelled: number;
    timeout: number;
    failed: number;
  } {
    const tasks = Array.from(this.tasks.values());

    return {
      total: tasks.length,
      running: tasks.filter((task) => task.status === TaskStatus.RUNNING).length,
      completed: tasks.filter((task) => task.status === TaskStatus.COMPLETED).length,
      cancelled: tasks.filter((task) => task.status === TaskStatus.CANCELLED).length,
      timeout: tasks.filter((task) => task.status === TaskStatus.TIMEOUT).length,
      failed: tasks.filter((task) => task.status === TaskStatus.FAILED).length
    };
  }

  private normalizeCollectResult<T>(
    rawResult: unknown
  ): BackgroundCollectEnvelope<T> {
    if (this.isCollectEnvelope<T>(rawResult)) {
      return rawResult;
    }

    return {
      status: TaskStatus.COMPLETED,
      data: rawResult as T
    };
  }

  private isCollectEnvelope<T>(value: unknown): value is BackgroundCollectEnvelope<T> {
    if (!value || typeof value !== 'object') {
      return false;
    }

    return 'status' in value || 'data' in value || 'error' in value;
  }

  private clearTaskTimeout(task: InternalTaskMetadata): void {
    if (task.timeoutHandle) {
      clearTimeout(task.timeoutHandle);
      task.timeoutHandle = undefined;
    }
  }

  private generateTaskId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `task_${timestamp}_${random}`;
  }
}

export default BackgroundManager;