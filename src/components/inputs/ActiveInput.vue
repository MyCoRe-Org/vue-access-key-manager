<template>
  <div class="form-check">
    <input
      id="inputActive"
      v-model="model"
      class="form-check-input"
      type="checkbox"
    />
    <label
      class="form-check-label"
      for="inputActive"
      @click.prevent="model = !model"
    >
      {{ t(getI18nKey('label.active')) }}
    </label>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { getI18nKey } from '@/common/utils';

const { t } = useI18n();
const model = defineModel<boolean>();
</script>
