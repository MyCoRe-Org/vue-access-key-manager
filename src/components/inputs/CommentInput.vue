<template>
  <label for="commentTextarea" class="form-label">
    {{ t(getI18nKey('label.comment')) }}
  </label>
  <textarea
    id="commentTextarea"
    v-model="model"
    class="form-control"
    rows="3"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { getI18nKey } from '@/common/utils';

const { t } = useI18n();
const model = defineModel<string>();
</script>
