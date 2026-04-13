export interface Artifact {
  type: 'url' | 'command' | 'filepath' | 'credential';
  value: string;
}

export interface ThreatPattern {
  pattern: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SafetyVerdict {
  decision: 'allow' | 'ask' | 'deny';
  reason?: string;
  confidence: number;
  artifacts: Artifact[];
}

export interface AgentPolicy {
  sensitivity: 'relaxed' | 'balanced' | 'paranoid';
  allowedPaths: string[];
  blockedPatterns: ThreatPattern[];
  requireApprovalFor: string[];
}

export interface AuditEntry {
  timestamp: Date;
  agentType: string;
  toolName: string;
  verdict: SafetyVerdict;
  input: string;
}

export interface SafetyGuardOptions {
  policies?: Record<string, AgentPolicy>;
  auditLog?: (entry: AuditEntry) => void;
  defaultPolicy?: AgentPolicy;
}

const THREAT_RCE_PIPE: ThreatPattern = {
  pattern: `(?:curl|wget)\s+[^\n|]+\|\s*(?:bash|sh)\b`,
  reason: 'Potential RCE: remote payload piped into shell',
  severity: 'critical',
};

const THREAT_RCE_EVAL_EXEC: ThreatPattern = {
  pattern: `\b(?:eval\s*\(|exec\s*\()`,
  reason: 'Potential RCE: dynamic code execution detected',
  severity: 'high',
};

const THREAT_REVERSE_SHELL_TCP: ThreatPattern = {
  pattern: `/dev/tcp/`,
  reason: 'Reverse shell indicator: /dev/tcp usage',
  severity: 'critical',
};

const THREAT_REVERSE_SHELL_NC: ThreatPattern = {
  pattern: `\bnc\s+[^\n]*\s-e\s`,
  reason: 'Reverse shell indicator: netcat -e usage',
  severity: 'critical',
};

const THREAT_REVERSE_SHELL_PYTHON: ThreatPattern = {
  pattern: `python\s+-c\s+["'][^"']*import\s+socket`,
  reason: 'Reverse shell indicator: python socket one-liner',
  severity: 'critical',
};

const THREAT_PRIVILEGE_SUDO: ThreatPattern = {
  pattern: `\bsudo\b`,
  reason: 'Privilege escalation: sudo invocation',
  severity: 'high',
};

const THREAT_PRIVILEGE_SU: ThreatPattern = {
  pattern: `\bsu\s+-\b`,
  reason: 'Privilege escalation: su - invocation',
  severity: 'high',
};

const THREAT_PRIVILEGE_CHMOD: ThreatPattern = {
  pattern: `\bchmod\s+777\b`,
  reason: 'Privilege escalation risk: world-writable permissions',
  severity: 'high',
};

const THREAT_PRIVILEGE_CHOWN_ROOT: ThreatPattern = {
  pattern: `\bchown\s+root\b`,
  reason: 'Privilege escalation risk: ownership reassignment to root',
  severity: 'high',
};

const THREAT_CRED_SSH: ThreatPattern = {
  pattern: `\bcat\s+~\/\.ssh(?:\/|\b)`,
  reason: 'Credential theft indicator: reading SSH material',
  severity: 'critical',
};

const THREAT_CRED_AWS: ThreatPattern = {
  pattern: `\bcat\s+~\/\.aws(?:\/|\b)`,
  reason: 'Credential theft indicator: reading AWS credentials/config',
  severity: 'critical',
};

const THREAT_CRED_ENV: ThreatPattern = {
  pattern: `\bcat\s+~\/\.env\b`,
  reason: 'Credential theft indicator: reading .env file',
  severity: 'high',
};

const THREAT_CRED_PRINTENV: ThreatPattern = {
  pattern: `\bprintenv\b`,
  reason: 'Credential exposure indicator: environment dump',
  severity: 'medium',
};

const THREAT_DESTRUCTIVE_RM: ThreatPattern = {
  pattern: `\brm\s+-rf\s+/\b`,
  reason: 'Destructive operation: recursive root deletion',
  severity: 'critical',
};

const THREAT_DESTRUCTIVE_MKFS: ThreatPattern = {
  pattern: `\bmkfs(?:\.[a-z0-9]+)?\b`,
  reason: 'Destructive operation: filesystem formatting',
  severity: 'critical',
};

const THREAT_DESTRUCTIVE_DD: ThreatPattern = {
  pattern: `\bdd\s+if=/dev/zero\b`,
  reason: 'Destructive operation: disk zeroing',
  severity: 'critical',
};

const THREAT_PERSISTENCE_CRONTAB: ThreatPattern = {
  pattern: `\bcrontab\b`,
  reason: 'Persistence indicator: cron job modification',
  severity: 'high',
};

const THREAT_PERSISTENCE_SYSTEMCTL: ThreatPattern = {
  pattern: `\bsystemctl\s+enable\b`,
  reason: 'Persistence indicator: enabling startup service',
  severity: 'high',
};

const THREAT_PERSISTENCE_BASHRC: ThreatPattern = {
  pattern: `(?:>>|>|tee\s+-a)\s+~\/\.bashrc\b`,
  reason: 'Persistence indicator: shell profile modification',
  severity: 'high',
};

export const DEFAULT_THREAT_PATTERNS: ThreatPattern[] = [
  THREAT_RCE_PIPE,
  THREAT_RCE_EVAL_EXEC,
  THREAT_REVERSE_SHELL_TCP,
  THREAT_REVERSE_SHELL_NC,
  THREAT_REVERSE_SHELL_PYTHON,
  THREAT_PRIVILEGE_SUDO,
  THREAT_PRIVILEGE_SU,
  THREAT_PRIVILEGE_CHMOD,
  THREAT_PRIVILEGE_CHOWN_ROOT,
  THREAT_CRED_SSH,
  THREAT_CRED_AWS,
  THREAT_CRED_ENV,
  THREAT_CRED_PRINTENV,
  THREAT_DESTRUCTIVE_RM,
  THREAT_DESTRUCTIVE_MKFS,
  THREAT_DESTRUCTIVE_DD,
  THREAT_PERSISTENCE_CRONTAB,
  THREAT_PERSISTENCE_SYSTEMCTL,
  THREAT_PERSISTENCE_BASHRC,
];

const DEFAULT_POLICY: AgentPolicy = {
  sensitivity: 'balanced',
  allowedPaths: [],
  blockedPatterns: [THREAT_RCE_PIPE, THREAT_RCE_EVAL_EXEC],
  requireApprovalFor: ['bash'],
};

export const DEFAULT_AGENT_POLICIES: Record<string, AgentPolicy> = {
  explore: {
    sensitivity: 'relaxed',
    allowedPaths: [],
    blockedPatterns: [],
    requireApprovalFor: [],
  },
  librarian: {
    sensitivity: 'balanced',
    allowedPaths: [],
    blockedPatterns: [THREAT_RCE_PIPE, THREAT_RCE_EVAL_EXEC],
    requireApprovalFor: ['bash'],
  },
  oracle: {
    sensitivity: 'paranoid',
    allowedPaths: [],
    blockedPatterns: [
      THREAT_RCE_PIPE,
      THREAT_RCE_EVAL_EXEC,
      THREAT_PRIVILEGE_SUDO,
      THREAT_PRIVILEGE_SU,
      THREAT_PRIVILEGE_CHMOD,
      THREAT_PRIVILEGE_CHOWN_ROOT,
    ],
    requireApprovalFor: ['bash', 'write', 'edit'],
  },
};

export class SafetyGuard {
  private readonly policies: Record<string, AgentPolicy>;
  private readonly auditCallback?: (entry: AuditEntry) => void;
  private readonly defaultPolicy: AgentPolicy;
  private readonly auditEntries: AuditEntry[] = [];

  constructor(options: SafetyGuardOptions = {}) {
    this.defaultPolicy = this.clonePolicy(options.defaultPolicy ?? DEFAULT_POLICY);

    const seededPolicies: Record<string, AgentPolicy> = {};
    for (const agentType in DEFAULT_AGENT_POLICIES) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_AGENT_POLICIES, agentType)) {
        seededPolicies[agentType] = this.clonePolicy(DEFAULT_AGENT_POLICIES[agentType]);
      }
    }

    if (options.policies) {
      for (const agentType in options.policies) {
        if (Object.prototype.hasOwnProperty.call(options.policies, agentType)) {
          seededPolicies[agentType] = this.clonePolicy(options.policies[agentType]);
        }
      }
    }

    this.policies = seededPolicies;
    this.auditCallback = options.auditLog;
  }

  evaluateToolCall(agentType: string, toolName: string, toolInput: string): SafetyVerdict {
    const policy = this.getPolicy(agentType);
    const artifacts = this.extractArtifacts(toolInput);

    let verdict = this.runHeuristics(artifacts, policy);

    if (verdict.decision === 'allow' && policy.requireApprovalFor.indexOf(toolName) !== -1) {
      verdict = {
        decision: 'ask',
        reason: `Tool '${toolName}' requires explicit approval for agent '${agentType}'.`,
        confidence: 0.8,
        artifacts,
      };
    }

    const entry: AuditEntry = {
      timestamp: new Date(),
      agentType,
      toolName,
      verdict,
      input: toolInput,
    };

    this.auditEntries.push(entry);
    this.auditCallback?.(entry);

    return verdict;
  }

  extractArtifacts(input: string): Artifact[] {
    const artifacts: Artifact[] = [];
    const seen: Record<string, true> = {};

    const addArtifact = (type: Artifact['type'], value: string): void => {
      const normalized = value.trim();
      if (!normalized) {
        return;
      }

      const key = `${type}:${normalized}`;
      if (seen[key]) {
        return;
      }

      seen[key] = true;
      artifacts.push({ type, value: normalized });
    };

    const urlRegex = /https?:\/\/[^\s"'`<>]+/gi;
    const urlMatches = input.match(urlRegex) || [];
    for (let index = 0; index < urlMatches.length; index += 1) {
      addArtifact('url', urlMatches[index]);
    }

    const filePathRegex = /(?:\.{1,2}\/|~\/|\/)[\w./-]+/g;
    const filePathMatches = input.match(filePathRegex) || [];
    for (let index = 0; index < filePathMatches.length; index += 1) {
      addArtifact('filepath', filePathMatches[index]);
    }

    const credentialRegex = /(?:api[_-]?key|token|secret|password|passwd|authorization)\s*[:=]\s*[^\s,;]+/gi;
    const credentialMatches = input.match(credentialRegex) || [];
    for (let index = 0; index < credentialMatches.length; index += 1) {
      addArtifact('credential', credentialMatches[index]);
    }

    const commandLineRegex = /(^|[;&|]\s*)(?:sudo\s+)?(?:bash|sh|zsh|curl|wget|rm|chmod|chown|mkfs|dd|python|node|npm|pnpm|yarn|git|cat|printenv|crontab|systemctl|nc)\b[^\n]*/gim;
    const commandMatches = input.match(commandLineRegex) || [];
    for (let index = 0; index < commandMatches.length; index += 1) {
      const command = commandMatches[index].trim();
      if (command) {
        addArtifact('command', command);
      }
    }

    const suspiciousShellRegex = /(?:\|\s*(?:bash|sh)\b|\/dev\/tcp\/|\bnc\s+[^\n]*\s-e\s|\brm\s+-rf\s+\/\b)/i;
    if (suspiciousShellRegex.test(input)) {
      addArtifact('command', input);
    }

    return artifacts;
  }

  getPolicy(agentType: string): AgentPolicy {
    const policy = this.policies[agentType];
    return this.clonePolicy(policy ?? this.defaultPolicy);
  }

  runHeuristics(artifacts: Artifact[], policy: AgentPolicy): SafetyVerdict {
    const matched: ThreatPattern[] = [];

    for (const artifact of artifacts) {
      for (const threat of policy.blockedPatterns) {
        const regex = new RegExp(threat.pattern, 'i');
        if (regex.test(artifact.value)) {
          matched.push(threat);
        }
      }

      if (artifact.type === 'filepath' && policy.allowedPaths.length > 0) {
        const isAllowed = policy.allowedPaths.some((allowedPath) =>
          artifact.value.indexOf(allowedPath) === 0
        );

        if (!isAllowed) {
          return {
            decision: policy.sensitivity === 'paranoid' ? 'deny' : 'ask',
            reason: `Path outside allowed scope: ${artifact.value}`,
            confidence: policy.sensitivity === 'paranoid' ? 0.95 : 0.7,
            artifacts,
          };
        }
      }

      if (artifact.type === 'credential') {
        if (policy.sensitivity === 'paranoid') {
          return {
            decision: 'deny',
            reason: 'Credential-like material detected in tool input.',
            confidence: 0.98,
            artifacts,
          };
        }

        if (policy.sensitivity === 'balanced') {
          return {
            decision: 'ask',
            reason: 'Credential-like material detected; confirmation required.',
            confidence: 0.75,
            artifacts,
          };
        }
      }
    }

    if (matched.length > 0) {
      const highestSeverity = matched.reduce<'low' | 'medium' | 'high' | 'critical'>(
        (highest, current) =>
          this.severityRank(current.severity) > this.severityRank(highest)
            ? current.severity
            : highest,
        'low'
      );

      const topReason = matched[0]?.reason ?? 'Blocked threat pattern matched.';

      if (highestSeverity === 'critical' || highestSeverity === 'high') {
        return {
          decision: 'deny',
          reason: topReason,
          confidence: highestSeverity === 'critical' ? 0.99 : 0.92,
          artifacts,
        };
      }

      return {
        decision: 'ask',
        reason: topReason,
        confidence: 0.72,
        artifacts,
      };
    }

    if (policy.sensitivity === 'paranoid' && artifacts.some((a) => a.type === 'command')) {
      return {
        decision: 'ask',
        reason: 'Paranoid policy requires confirmation for command-like input.',
        confidence: 0.68,
        artifacts,
      };
    }

    return {
      decision: 'allow',
      confidence: 0.9,
      artifacts,
    };
  }

  addPolicy(agentType: string, policy: AgentPolicy): void {
    this.policies[agentType] = this.clonePolicy(policy);
  }

  getAuditLog(): AuditEntry[] {
    return this.auditEntries.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp.getTime()),
      verdict: {
        ...entry.verdict,
        artifacts: [...entry.verdict.artifacts],
      },
    }));
  }

  private severityRank(severity: ThreatPattern['severity']): number {
    switch (severity) {
      case 'low':
        return 1;
      case 'medium':
        return 2;
      case 'high':
        return 3;
      case 'critical':
        return 4;
      default:
        return 0;
    }
  }

  private clonePolicy(policy: AgentPolicy): AgentPolicy {
    return {
      sensitivity: policy.sensitivity,
      allowedPaths: [...policy.allowedPaths],
      blockedPatterns: policy.blockedPatterns.map((pattern) => ({ ...pattern })),
      requireApprovalFor: [...policy.requireApprovalFor],
    };
  }
}

export function createSafetyGuard(options?: SafetyGuardOptions): SafetyGuard {
  return new SafetyGuard(options);
}
