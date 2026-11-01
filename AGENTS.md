# Agent guidelines

## Project

- This repository contains a Next.js/React web app in `src/` and Python scripts in `python/` for working with the EVDuty API.
- Follow existing conventions and keep changes focused on the request.

## Test-driven development

- For behavior changes and bug fixes, first write a focused test that fails for the intended reason, then implement the smallest change that makes it pass, and refactor while keeping tests green.
- Cover relevant edge cases and regressions. Keep tests deterministic; use fakes or mocks instead of real EVDuty credentials or network calls.
- Run relevant tests and checks before finishing, and report any failures or checks that could not be run. If no suitable test setup exists, explain the limitation and establish an appropriate minimal setup when practical.

## Dependency injection

- Pass external dependencies (such as API clients, storage, clocks, and configuration) into the code that uses them, rather than creating or accessing them implicitly throughout the codebase.
- Prefer simple function parameters and lightweight interfaces over dependency injection frameworks. Keep business logic separate from I/O so it can be tested independently.

## Deletion and safety

- Ask for explicit user approval before deleting anything, including files, directories, code, data, dependencies, or generated artifacts. Do not delete as part of cleanup, refactoring, or running commands without approval.
- Preserve unrelated user changes. Never commit or print credentials, access tokens, or private account data.
