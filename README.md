# Vue Access Key Manager

This repository contains a Vue component library for managing MyCoRe access keys.

## 📦 Installation

```sh
npm install @mycore-org/vue-access-key-manager
```

## 📖 Usage

Install the plugin once, in your app's entry point:

```ts
import { createApp } from 'vue';
import { createAccessKeyManager } from '@mycore-org/vue-access-key-manager';
import { AccessTokenAuthStrategy } from '@mycore/js-common/auth';

const app = createApp(App);

app.use(
  createAccessKeyManager({
    baseUrl: 'https://example.org/mir',
    authStrategy: new AccessTokenAuthStrategy('AccessToken'),
    accessKeyConfig: { allowedSessionPermissions: ['read'] },
  })
);
```

Then use the component anywhere in your app - `base-url`, `auth-strategy` and
`allowed-session-permissions` are read from the plugin, not passed as props:

```vue
<template>
  <AccessKeyManager
    reference="test_mods_00000001"
    :permissions="['read']"
    current-page="1"
    page-size="8"
    router-enabled
    @error="handleError"
  />
</template>

<script setup lang="ts">
import { AccessKeyManager } from '@mycore-org/vue-access-key-manager';

const handleError = (e) => {
  console.error(e);
};
</script>
```

### `createAccessKeyManager(options)`

| Option            | Type              | Default     | Description |
|-------------------|-------------------|-------------|-------------|
| `baseUrl`         | string            |             | The base URL of the backend. A trailing slash is added automatically if missing |
| `authStrategy`    | AuthStrategy      | `undefined` | An authentication strategy for requests to the backend. Omit to let components fetch their own access-key-scoped JWT instead |
| `accessKeyConfig` | AccessKeyConfig   | `{}`        | Access-key-specific settings, currently just `allowedSessionPermissions` (see below) |

`accessKeyConfig` can be reassigned after installation (`accessKeyManager.accessKeyConfig = { ... }`); `baseUrl` and `authStrategy` are expected to stay the same for the app's lifetime.

### `<AccessKeyManager>` properties

| Property              | Type            | Default     | Description |
|-----------------------|-----------------|-------------|-------------|
| `reference`           | string          | `undefined` | The reference for the object to be managed. If no reference is specified, an admin mode is assumed  |
| `permissions`         | string[]        | `undefined` | The permissions that may be managed |
| `current-page`        | int             | `1`         | Used to set the current page |
| `page-size`           | int             | `8`         | Used to set the page size |
| `router-enabled`      | boolean         | `false`     | When set to `true`, the router is used, for example, to set the pagination in the url |

### Events
| Event   | Arguments              | Description |
|---------|------------------------|-------------|
| `error` | `error` - error object | If an unexpected error occurs |
| `page-change` | `page` - current page | If the current page changes |

## 📜 License

This project is licensed under the GPL 3.0 or later.
