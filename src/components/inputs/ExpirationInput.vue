<template>
  <label for="expirationInput" class="form-label">
    {{ t(getI18nKey('label.expiration')) }}
  </label>
  <div class="input-group">
    <input
      id="expirationInput"
      v-model="model"
      :min="today"
      type="date"
      class="form-control"
      @keydown.prevent
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { getI18nKey } from '@/common/utils';

const { t } = useI18n();
const model = defineModel<number | string | null>();
const today = new Date().toISOString().split('T')[0];
</script>
