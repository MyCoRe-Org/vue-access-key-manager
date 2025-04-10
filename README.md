# Vue Access Key Manager

This repository contains a Vue component library for managing MyCoRe access keys.

## 📦 Installation

```sh
npm install @mycore-org/vue-access-key-manager
```

## 📖 Usage
```vue
<template>
  <AccessKeyManager
    :base-url="'localhost:8000/mir'"
    :auth-strategy="authStrategy"
    reference="test_mods_00000001"
    :permissions="['read']"
    :allowed-session-permissions="['read']"
    current-page="1"
    page-size="8"
    router-enabled
    @error="handleError"
  />
</template>

<script setup lang="ts">
import { AccessKeyManager } from '@mycore-org/vue-access-key-manager';
import { AccessTokenAuthStrategy } from '@mycore/js-common/auth';

const handleError = (e) => {
  console.error(e);
};

const authStrategy = new AccessTokenAuthStrategy('AccessToken');
</script>
```

### Properties

| Property              | Type            | Default     | Description |
|-----------------------|-----------------|-------------|-------------|
| `baseUrl`             | string          |             | The base Url of the backend |
| `auth-strategy`       | AuthStrategy    | `undefined` | An authentication strategy for the requests with the backend |
| `reference`           | string          | `undefined` | The reference for the object to be managed. If no reference is specified, an admin mode is assumed  |
| `permissions`         | string[]        | `undefined` | The permissions that may be managed |
| `allowed-session-permissions` | string[]        | `undefined`        | The allowed access key permissions for session |
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
