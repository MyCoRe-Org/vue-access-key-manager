<template>
  <label :for="id" class="form-label">
    {{ t(getI18nKey('label.expiration')) }}
  </label>
  <input
    :id="id"
    v-model="model"
    :min="min"
    max="9999-12-31"
    type="date"
    class="form-control"
    :class="{ 'is-invalid': invalid }"
    @focus="updateMin"
    @input="checkInput"
    @blur="checkInput"
  />
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { getI18nKey, getMinExpirationDate } from '@/common/utils';

const { t } = useI18n();
const id = useId();

defineProps<{
  invalid?: boolean;
}>();
const model = defineModel<number | string | null>();
const incomplete = defineModel<boolean>('incomplete', { default: false });
const checkInput = (event: Event): void => {
  incomplete.value = (event.target as HTMLInputElement).validity.badInput;
};
const min = ref(getMinExpirationDate());
const updateMin = (): void => {
  min.value = getMinExpirationDate();
};
</script>
