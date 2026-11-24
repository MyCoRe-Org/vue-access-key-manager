<template>
  <label :for="id" class="form-label">
    {{ t(getI18nKey('label.expiration')) }}
  </label>
  <div class="input-group">
    <input
      :id="id"
      v-model="model"
      :min="today"
      type="date"
      class="form-control"
      @keydown.prevent
    />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { getI18nKey } from '@/common/utils';

const { t } = useI18n();
const id = useId();
const model = defineModel<number | string | null>();
const now = new Date();
const today = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-');
</script>
