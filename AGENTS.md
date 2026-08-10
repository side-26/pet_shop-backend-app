# Repository agent instructions

For every coding task or code change in this repository, read and apply the complete workflow in `.agents/skills/app-general-workflow/SKILL.md`.

Treat `app-general-workflow` as mandatory repository policy even when the user does not explicitly name it. Apply its production-quality checks, entity architecture, test coverage, naming, and constant-usage rules before considering work complete.

When adding or changing a Zod schema, inspect `src/configs/zod.config.js`. Add any missing Zod issue-code mapping and Persian field label in the same change.

In every new or modified source file, group imports in this order: external packages, internal application imports, then relative imports. Separate each non-empty group with one blank line.

Never call Zod schema builders through `z.<functionName>`. Destructure the required builders from `z` first, then use the destructured functions in schemas.
