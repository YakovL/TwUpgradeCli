This cli can be used to update local TiddlyWiki Classic with the new core from its official site.
It requires Node.js to work. With `npx`, it's not necessary to download/clone it manually.

Usage: `npx github:YakovL/TwUpgradeCli --input ./path/to/tw.html` (on Windows, `\`s in path are also supported).

Note: this script currently reproduces some of the core functionality,
so may get outdated in the future (copies content, markup blocks, and title).
