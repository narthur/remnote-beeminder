# remnote-beeminder

This plugin syncs your RemNote progress to Beeminder.

Supported metrics:

- Review count on all cards
- Edit count for rems with an ancestor tagged with `BmCountEdits`

When supplying goal names for each metric in the plugin settings, provide
the naked goalname. That is, if your goal is `username/goalname`, then
just provide `goalname` in the goal field.

Your Beeminder username and auth token are found at the following URL:

<https://www.beeminder.com/api/v1/auth_token.json>

## Local Development

```bash
npm ci
npm run build
npm run dev
```

Then follow the instructions [here][1].

[1]: https://plugins.remnote.com/getting-started/quick_start_guide#run-the-plugin-template-inside-remnote