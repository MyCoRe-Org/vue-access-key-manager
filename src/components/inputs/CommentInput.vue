<template>
  <label :for="id" class="form-label">
    {{ t(getI18nKey('label.comment')) }}
  </label>
  <textarea :id="id" v-model="model" class="form-control" rows="3" />
</template>

<script setup lang="ts">
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { getI18nKey } from '@/common/utils';

const { t } = useI18n();
const id = useId();
const model = defineModel<string>();
</script>
