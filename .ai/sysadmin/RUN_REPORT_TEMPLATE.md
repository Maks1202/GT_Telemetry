# SysAdmin Run Report Template

After an authorized run, SysAdmin sends this report to the PO in Russian, then stops. Architect closes the ops task. Do not merge and do not start Develop.

Store a copy at `.ai/sysadmin/runs/<TASK-ID>.md` when the task requires a file record.

```markdown
## Отчёт

- Роль: SysAdmin
- Задача: <TASK-ID>
- Статус: SYSADMIN_DONE | Блокер
- Что сделано:
  - Цель прогона:
  - Среда (хост / путь, без секретов):
  - Команды и результат (кратко):
  - Проверка, что цель достигнута:
- Вне scope:
- Блокеры:
- Репозиторий: main CLEAN или BLOCKED; ветка; не мержил
- Следующий шаг: Architect closeout этого ops-задания

## Что это значит простыми словами

<2–5 предложений: что сейчас работает, что проверить человеку, что нельзя запускать следом>
```

Rules:

- No secrets, tokens, or private keys in the report
- No application feature diff
- No second `text` fence unless Architect's original task told SysAdmin to hand back a specific Architect closeout prompt. Default: no fence. The next actor is Architect, and Architect already owns closeout without a new role switch inside this chat.
- If the run failed, status is `Блокер`. Leave the system uncleaned only if cleanup itself is unsafe; say what the PO must decide.
