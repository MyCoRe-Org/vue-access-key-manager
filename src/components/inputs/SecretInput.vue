<template>
  <label for="inputSecret" class="form-label">
    {{ t(getI18nKey('label.secret')) }}
  </label>
  <div class="input-group mb-3">
    <span class="input-group-prepend">
      <button
        class="btn btn-primary"
        type="button"
        aria-label="generate secret"
        @click="generateSecret"
      >
        <i class="fa fa-random" />
      </button>
    </span>
    <input
      id="inputSecret"
      v-model="model"
      type="text"
      class="form-control"
      required
      :class="{ 'is-invalid': invalid }"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import { generateRandomString } from '@/common/utils';
import { useI18n } from 'vue-i18n';
import { getI18nKey } from '@/common/utils';

const { t } = useI18n();

defineProps<{
  invalid: boolean;
}>();
const model = defineModel<string>();
const generateSecret = (): void => {
  model.value = generateRandomString(16);
};
</script>
