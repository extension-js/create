[npm-version-image]: https://img.shields.io/npm/v/extension-create.svg?color=0971fe
[npm-version-url]: https://www.npmjs.com/package/extension-create
[downloads-image]: https://img.shields.io/npm/dm/extension-create.svg?color=2ecc40
[downloads-url]: https://npmjs.org/package/extension-create
[empowering-image]: https://img.shields.io/badge/Empowering-Extension.js-0971fe
[empowering-url]: https://extension.js.org

[![Empowering][empowering-image]][empowering-url] [![Version][npm-version-image]][npm-version-url] [![Downloads][downloads-image]][downloads-url]

# extension-create

The standalone extension creation engine from [Extension.js](https://github.com/extension-js/extension.js). It provides an intuitive API for programmatically creating browser extensions with support for multiple frameworks and templates.

## Installation

Install the package using your preferred package manager:

```bash
npm install extension-create
# or
pnpm add extension-create
# or
yarn add extension-create
```

## Quick Start

Create a new extension with a single function call:

```javascript
import { extensionCreate } from "extension-create";

// Create a basic extension
await extensionCreate("my-extension", {
  template: "init",
});

// Create a React extension and install its dependencies
await extensionCreate("my-react-extension", {
  template: "react",
  install: true,
});
```

## API Reference

### `extensionCreate(projectName, options)`

Creates a new extension project with the specified configuration.

#### Parameters

- `projectName` (string, required) - The name of your extension project
- `options` (object) - Configuration options
  - `template` (string, optional) - Template name or URL. Defaults to `'init'`
  - `install` (boolean, optional) - Whether to install dependencies. Defaults to `true`
  - `cliVersion` (string, optional) - CLI version for package.json

## Templates

Templates are sourced from the public Examples repository. See the catalog at `https://github.com/extension-js/examples` and reference templates by name, e.g. `content`, `content-react`, `content-vue`, etc.

## License

MIT (c) Cezar Augusto.
