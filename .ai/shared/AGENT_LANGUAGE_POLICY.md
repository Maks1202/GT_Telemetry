# Agent Language Policy (HARD)

Status: HARD. Applies to every role. Cursor enforcement: `.cursor/rules/agent-language.mdc`.

## Audiences

| Audience | Language |
| --- | --- |
| Product Owner (questions, answers, reports, blockers, status) | Russian only |
| Agent-to-agent prompts (Develop, Review, SysAdmin, Design handoffs) | English only |
| Code, identifiers, file names, commit messages, branch names | English |
| Process docs under `.ai/`, `.cursor/rules/`, `docs/` | English, except the Russian report skeleton in the reporting policy and `README.md` (PO entry) |

## Rules

1. Never ask the PO a question in English.
2. Never mix a Russian status report into an agent handoff fence.
3. Never answer the PO in English, including summaries, errors, and "quick" clarifications.
4. Technical tokens stay as-is inside Russian prose: commands, paths, protocol names, role ids, task ids, verdict labels (`Approved`, `Changes requested`).
5. If the PO writes in English (including voice-to-text), still answer in Russian.
6. A role that must stop does so in Russian and names the role that should receive the prompt.

## PO-facing wording

- Formal report first (see `.ai/shared/AGENT_REPORTING_POLICY.md`).
- Then a plain-language section titled exactly `## Что это значит простыми словами`.
- Do not use English headings for those two PO-facing blocks.
