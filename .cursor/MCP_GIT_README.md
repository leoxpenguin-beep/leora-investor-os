# Git MCP Server for Cursor

This project is configured to use the **Git MCP server** so you can run Git operations (status, diff, commit, add, push, branches, etc.) directly from Cursor Composer.

## Add your Git / GitHub API key

1. Open **`.cursor/mcp.json`** in this project.
2. Replace `YOUR_GITHUB_OR_GIT_API_TOKEN_HERE` with your real token:
   - **GitHub**: [Create a Personal Access Token](https://github.com/settings/tokens) (repo scope for private repos).
   - **GitLab / other**: Use that service’s API token in the same `GITHUB_TOKEN` field if the server supports it; otherwise add the variable name your server expects in `env`.

Example after editing:

```json
"env": {
  "GITHUB_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxx"
}
```

3. Save the file and **restart Cursor** (or reload the window) so the MCP server picks up the new env.

## Requirements

- **Option A (recommended):** [uv](https://docs.astral.sh/uv/) installed, then run with `uvx mcp-server-git` (already set in `mcp.json`).
- **Option B:** If you don’t use uv, install with pip and switch the command in `mcp.json`:

```bash
pip install mcp-server-git
```

Then in `.cursor/mcp.json` change the Git server to:

```json
"git": {
  "command": "python",
  "args": ["-m", "mcp_server_git"],
  "env": {
    "GITHUB_TOKEN": "YOUR_TOKEN_HERE"
  }
}
```

- **Git** must be installed on your system.

## Using the Git MCP in Cursor

- MCP tools are available to the **Composer Agent** (not in simple chat).
- After restart/reload, the agent can use tools such as: `git_status`, `git_diff_staged`, `git_diff_unstaged`, `git_commit`, `git_add`, `git_push`, `git_log`, `git_branch`, `git_checkout`, etc.
- You can ask in natural language, e.g. “Show git status”, “Commit with message …”, “Push to origin”.

## Optional: Pin to a specific repo

To limit the server to one repository, add `--repository` to `args` in `mcp.json`:

```json
"args": ["mcp-server-git", "--repository", "C:\\path\\to\\your\\repo"]
```

## Security

- Do **not** commit real tokens to Git. Keep `GITHUB_TOKEN` in `.cursor/mcp.json` and add `.cursor/mcp.json` to `.gitignore` if the file contains secrets, or use a global config at `~/.cursor/mcp.json` with your token instead.
