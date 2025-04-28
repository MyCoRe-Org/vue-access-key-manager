<template>
  <label for="inputReference" class="form-label">
    {{ t(getI18nKey('label.reference')) }}
  </label>
  <input
    id="inputReference"
    v-model="model"
    type="text"
    :disabled="reference !== undefined"
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
  invalid: boolean;
  reference?: string;
}>();
const model = defineModel<string>();
</script>
