# Linear command menu context study

Captured from the Linear desktop app on September 2, 2026 after creating a
contained benchmark dataset in the existing Playground team.

## Benchmark records

- Projects: `Command Menu Polish`, `Legacy Import`
- Top-level issues: PGD-28 through PGD-35
- Sub-issues: PGD-36 and PGD-37 under PGD-28
- Document: `Command menu benchmark notes`
- Team label: `cmdk-benchmark`

PGD-28 is In Progress with High priority. PGD-29 is Todo with Medium priority.
PGD-30 is In Review with Low priority. The remaining issues are in Backlog.
`Legacy Import` is Canceled. Linear does not expose a manual project-archive
action; an existing archived project remains visible in capture 05.

## Captures

1. `01-my-issues-project-search.png`: project-name search from My issues.
2. `02-my-issues-exact-key-search.png`: exact issue-key search from My issues.
3. `03-issue-context-default.png`: default commands for an existing issue.
4. `04-project-context-default.png`: default commands for an existing project.
5. `05-project-context-search.png`: mixed entities returned while a project is in focus.
6. `06-populated-project-document-search.png`: new benchmark project and document.
7. `07-populated-command-and-entity-search.png`: commands and entities for `search`.
8. `08-label-name-no-results.png`: exact label name does not produce a quick result.
9. `09-legacy-project-search.png`: project plus associated issue result.
10. `10-populated-issue-context.png`: issue-scoped actions for PGD-28.
11. `11-populated-project-context.png`: project-scoped actions for Command Menu Polish.
12. `12-populated-project-context-search.png`: global search from project context.

## Content findings

- An empty query is object-aware. Issue and project pages expose different action
  inventories and name the focused object above the results.
- Typing replaces the scoped action inventory with commands plus workspace-wide
  entity results. The object breadcrumb remains visible.
- Entity rows use compact type and relationship labels instead of descriptions.
- The final row consistently hands off to full workspace search.
- Footer actions change with the focused result: Select, Open, Advanced search,
  More actions, and Quick look appear only when relevant.
- An exact team-label name does not appear as a direct quick result. Labels are
  applied through scoped commands or used in advanced search and filters.
