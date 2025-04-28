<template>
  <label for="inputPermission" class="form-label">
    {{ t(getI18nKey('label.permission')) }}
  </label>
  <select
    v-if="permissions"
    id="inputPermission"
    v-model="model"
    class="form-select"
    required
    :class="{ 'is-invalid': invalid }"
  >
    <option v-for="option in permissions" :key="option" :value="option">
      {{ option }}
    </option>
  </select>
  <input
    v-else
    id="inputPermission"
    v-model="model"
    type="text"
    class="form-control"
    required
    :class="{ 'is-invalid': invalid }"
  />
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import { useI18n } from 'vue-i18n';
import { getI18nKey } from '@/common/utils';

const { t } = useI18n();

defineProps<{
  permissions?: string[];
  invalid: boolean;
}>();
const model = defineModel<string>();
</script>
