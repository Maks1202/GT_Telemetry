# Agent Reporting Policy (HARD)

Status: HARD. Cursor enforcement: `.cursor/rules/agent-reporting.mdc` and `.cursor/rules/copy-paste-prompt.mdc`.

Applies to every PO-facing completion, status, blocker, and handoff.

## Message shape

1. Formal report in Russian.
2. A section titled exactly:

```markdown
## Что это значит простыми словами
```

3. A handoff fence only when this role owes another role a self-contained prompt:

| From | Fence |
| --- | --- |
| Architect | One English prompt for Developer, SysAdmin, or Designer, when that work is authorized |
| Developer | One English Reviewer prompt |
| Reviewer | None. Name Architect (merge/closeout) or Developer (remediation) in the Russian report |
| SysAdmin | None. Name Architect closeout in the Russian report |
| Designer | None, unless the Architect task explicitly requires a return prompt |

The fence is a single `text` block, last in the message, with nothing after it. If no fence is required, do not add one.

## Formal report (Russian)

Use this skeleton. Omit a field only when it does not apply; do not invent work.

```markdown
## Отчёт

- Роль:
- Задача:
- Статус:
- Что сделано:
- Вне scope:
- Блокеры:
- Репозиторий: (ветка, clean/dirty, merged или нет)
- Следующий шаг: (кто именно)
```

Status values (Russian prose, plus the English lifecycle token when useful):

- Готово
- В работе
- Блокер
- Сдано на ревью
- Одобрено (это ещё не закрытие задачи)
- Нужны правки
- Закрыто

## Plain-language section

Short Russian. What changed for the PO, what is safe to do next, and what must not be started. No process jargon without a one-line explanation.

## Handoff fence

Use a fence only in the cases in the table above.

- Exactly one fenced block, language tag `text`
- English only inside the fence
- The Russian report is outside the fence
- The prompt is complete and self-contained (see `.ai/shared/DEVELOPER_PROMPT_CANON.md` or the matching template)
- Not a checklist, not a link-only note, not a fragment

Developer handoff files: `.ai/develop/prompts/<TASK-ID>.md`  
Reviewer template: `.ai/develop/REVIEW_PROMPT_TEMPLATE.md`  
SysAdmin run report: `.ai/sysadmin/RUN_REPORT_TEMPLATE.md`

## Stop

After the required fence, or after the report when no fence is required, stop. Do not continue as the next role in the same turn.
