const SUBCOMMAND_HELP: Record<string, string> = {
  config: [
    'Usage: umb config',
    '',
    'Re-run the interactive setup wizard to configure:',
    '  - LLM provider (Anthropic, OpenAI, Google, OpenRouter, Ollama, LM Studio, etc.)',
    '  - Web search provider (Brave, Tavily, built-in)',
    '  - Remote questions (Discord, Slack, Telegram)',
    '  - Tool API keys (Context7, Jina, Groq)',
    '',
    'All steps are skippable and can be changed later with /login or /search-provider.',
    '',
    'For detailed provider setup instructions (OpenRouter, Ollama, LM Studio, vLLM,',
    'and other OpenAI-compatible endpoints), see docs/providers.md.',
  ].join('\n'),

  update: [
    'Usage: umb update',
    '',
    'Update UMB to the latest version.',
    '',
    'Equivalent to: npm install -g umb-cli@latest',
  ].join('\n'),

  sessions: [
    'Usage: umb sessions',
    '',
    'List all saved sessions for the current directory and interactively',
    'pick one to resume. Shows date, message count, and a preview of the',
    'first message for each session.',
    '',
    'Sessions are stored per-directory, so you only see sessions that were',
    'started from the current working directory.',
    '',
    'Compare with --continue (-c) which always resumes the most recent session.',
  ].join('\n'),

  install: [
    'Usage: umb install <source> [-l, --local]',
    '',
    'Install a package/extension source and run post-install validation (dependency checks, setup).',
    '',
    'Examples:',
    '  umb install npm:@foo/bar',
    '  umb install git:github.com/user/repo',
    '  umb install https://github.com/user/repo',
    '  umb install ./local/path',
  ].join('\n'),

  remove: [
    'Usage: umb remove <source> [-l, --local]',
    '',
    'Remove an installed package source and its settings entry.',
  ].join('\n'),

  list: [
    'Usage: umb list',
    '',
    'List installed package sources from user and project settings.',
  ].join('\n'),

  worktree: [
    'Usage: umb worktree <command> [args]',
    '',
    'Manage isolated git worktrees for parallel work streams.',
    '',
    'Commands:',
    '  list                 List worktrees with status (files changed, commits, dirty)',
    '  merge [name]         Squash-merge a worktree into main and clean up',
    '  clean                Remove all worktrees that have been merged or are empty',
    '  remove <name>        Remove a worktree (--force to remove with unmerged changes)',
    '',
    'The -w flag creates/resumes worktrees for interactive sessions:',
    '  umb -w               Auto-name a new worktree, or resume the only active one',
    '  umb -w my-feature    Create or resume a named worktree',
    '',
    'Lifecycle:',
    '  1. umb -w             Create worktree, start session inside it',
    '  2. (work normally)    All changes happen on the worktree branch',
    '  3. Ctrl+C             Exit — dirty work is auto-committed',
    '  4. umb -w             Resume where you left off',
    '  5. umb worktree merge Squash-merge into main when done',
    '',
    'Examples:',
    '  umb -w                              Start in a new auto-named worktree',
    '  umb -w auth-refactor                Create/resume "auth-refactor" worktree',
    '  umb worktree list                   See all worktrees and their status',
    '  umb worktree merge auth-refactor    Merge and clean up',
    '  umb worktree clean                  Remove all merged/empty worktrees',
    '  umb worktree remove old-branch      Remove a specific worktree',
    '  umb worktree remove old-branch --force  Remove even with unmerged changes',
  ].join('\n'),

  headless: [
    'Usage: umb headless [flags] [command] [args...]',
    '',
    'Run commands without the TUI.',
    '',
    'Flags:',
    '  --timeout N            Overall timeout in ms (default: 300000)',
    '  --json                 JSONL event stream to stdout',
    '  --output-format <fmt>  Output format: text (default), json, stream-json',
    '  --bare                 Minimal context: skip CLAUDE.md, AGENTS.md, user settings, user skills',
    '  --resume <id>          Resume a prior headless session by ID',
    '  --model ID             Override model',
    '  --supervised           Forward interactive UI requests to orchestrator via stdout/stdin',
    '  --response-timeout N   Timeout (ms) for orchestrator response (default: 30000)',
    '  --answers <path>       Pre-supply answers and secrets (JSON file)',
    '  --events <types>       Filter JSONL output to specific event types (comma-separated)',
    '',
    'Commands:',
    '  auto                 Run all queued units continuously (default)',
    '  next                 Run one unit',
    '  status               Show progress dashboard',
    '',
    'Exit codes: 0 = success, 1 = error/timeout, 10 = blocked, 11 = cancelled',
  ].join('\n'),
}

// Alias: `umb wt --help` → same as `umb worktree --help`
SUBCOMMAND_HELP['wt'] = SUBCOMMAND_HELP['worktree']

export function printHelp(version: string): void {
  process.stdout.write(`UMB v${version} — Umbrella Blade\n\n`)
  process.stdout.write('Usage: umb [options] [message...]\n\n')
  process.stdout.write('Options:\n')
  process.stdout.write('  --mode <text|json|rpc|mcp> Output mode (default: interactive)\n')
  process.stdout.write('  --print, -p              Single-shot print mode\n')
  process.stdout.write('  --continue, -c           Resume the most recent session\n')
  process.stdout.write('  --worktree, -w [name]    Start in an isolated worktree (auto-named if omitted)\n')
  process.stdout.write('  --model <id>             Override model (e.g. claude-opus-4-6)\n')
  process.stdout.write('  --no-session             Disable session persistence\n')
  process.stdout.write('  --extension <path>       Load additional extension\n')
  process.stdout.write('  --tools <a,b,c>          Restrict available tools\n')
  process.stdout.write('  --list-models [search]   List available models and exit\n')
  process.stdout.write('  --version, -v            Print version and exit\n')
  process.stdout.write('  --help, -h               Print this help and exit\n')
  process.stdout.write('\nSubcommands:\n')
  process.stdout.write('  config                   Re-run the setup wizard\n')
  process.stdout.write('  install <source>         Install a package/extension source\n')
  process.stdout.write('  remove <source>          Remove an installed package source\n')
  process.stdout.write('  list                     List installed package sources\n')
  process.stdout.write('  update                   Update UMB to the latest version\n')
  process.stdout.write('  sessions                 List and resume a past session\n')
  process.stdout.write('  worktree <cmd>           Manage worktrees (list, merge, clean, remove)\n')
  process.stdout.write('  headless [cmd] [args]    Run commands without TUI\n')
  process.stdout.write('\nRun umb <subcommand> --help for subcommand-specific help.\n')
}

export function printSubcommandHelp(subcommand: string, version: string): boolean {
  const help = SUBCOMMAND_HELP[subcommand]
  if (!help) return false
  process.stdout.write(`UMB v${version} — Umbrella Blade\n\n`)
  process.stdout.write(help + '\n')
  return true
}
