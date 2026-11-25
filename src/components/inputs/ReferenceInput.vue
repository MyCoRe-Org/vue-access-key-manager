<template>
  <label :for="id" class="form-label">
    {{ t(getI18nKey('label.reference')) }}
  </label>
  <input
    :id="id"
    v-model="model"
    type="text"
    :disabled="reference !== undefined"
    class="form-control"
    :class="{ 'is-invalid': invalid }"
  />
</template>

<script setup lang="ts">
import { defineProps, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { getI18nKey } from '@/common/utils';

const { t } = useI18n();
const id = useId();

defineProps<{
  invalid: boolean;
  reference?: string;
}>();
const model = defineModel<string>();
</script>
