<template>
  <label :for="id" class="form-label">
    {{ t(getI18nKey('label.expiration')) }}
  </label>
  <div class="input-group">
    <input
      :id="id"
      v-model="model"
      :min="min"
      type="date"
      class="form-control"
      @focus="updateMin"
      @keydown.prevent
    />
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { getI18nKey } from '@/common/utils';

const { t } = useI18n();
const id = useId();
const model = defineModel<number | string | null>();
const tomorrowUtc = (): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
const min = ref(tomorrowUtc());
const updateMin = (): void => {
  min.value = tomorrowUtc();
};
</script>
