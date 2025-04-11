<template>
  <BaseModal
    id="createAccessKeyModal"
    ref="createAccessKeyModalRef"
    v-model:visible="visible"
    :title="t(getI18nKey('title.viewAccessKey'))"
    :busy="isBusy"
    @hidden="resetContent"
  >
    <div
      v-if="errorMessage"
      class="alert alert-danger text-center"
      role="alert"
      aria-live="polite"
    >
      {{ t(errorMessage) }}
    </div>
    <div>
      <p>{{ t(getI18nKey('description.createAccesskey')) }}</p>
    </div>
    <form class="row g-3">
      <div class="col-12">
        <label for="inputReference" class="form-label">
          {{ t(getI18nKey('label.reference')) }}
        </label>
        <input
          id="inputReference"
          v-model="form.reference"
          type="text"
          :disabled="reference !== undefined"
          class="form-control"
        />
      </div>

      <div class="col-12">
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
            v-model="form.secret"
            type="text"
            class="form-control"
          />
        </div>
      </div>
      <div class="col-md-6">
        <label for="inputPermission" class="form-label">
          {{ t(getI18nKey('label.permission')) }}
        </label>
        <select
          v-if="permissions"
          id="inputPermission"
          v-model="form.type"
          class="form-select"
        >
          <option
            v-for="permissionValue in permissions"
            :key="permissionValue"
            :value="permissionValue"
          >
            {{ permissionValue }}
          </option>
        </select>
        <input
          v-else
          id="inputPermission"
          v-model="form.type"
          type="text"
          class="form-control"
        />
      </div>
      <div class="col-md-6">
        <label for="expirationInput" class="form-label">
          {{ t(getI18nKey('label.expiration')) }}
        </label>
        <div class="input-group">
          <input
            id="expirationInput"
            v-model="form.expiration"
            type="date"
            class="form-control"
          />
        </div>
      </div>
      <div class="col-12">
        <div class="form-check">
          <input
            id="inputActive"
            v-model="form.isActive"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label" for="inputActive">
            {{ t(getI18nKey('label.active')) }}
          </label>
        </div>
      </div>
      <div class="col-12">
        <label for="commentTextarea" class="form-label">
          {{ t(getI18nKey('label.comment')) }}
        </label>
        <textarea
          id="commentTextarea"
          v-model="form.comment"
          class="form-control"
          rows="3"
        />
      </div>
    </form>
    <template #modal-footer>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="isBusy || v.$invalid"
        @click="handleCreateAccessKey"
      >
        <span
          v-if="isBusy"
          class="spinner-border spinner-border-sm"
          role="status"
          aria-hidden="true"
        />
        {{ t(getI18nKey('button.createAccessKey')) }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, ModelRef, onErrorCaptured } from 'vue';
import { useI18n } from 'vue-i18n';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import {
  getI18nKey,
  generateRandomString,
  getUnixTimestamp,
} from '@/common/utils';
import {
  AccessKey,
  CreateAccessKey,
  AccessKeyService,
} from '@jsr/mycore__js-common/access-key';
import { BaseModal } from '@mycore-org/vue-components';

const { t } = useI18n();

const props = defineProps<{
  accessKeyService?: AccessKeyService;
  reference?: string;
  permissions?: string[];
}>();

const emit = defineEmits<{
  (event: 'add-access-key', secret: string, accessKey: AccessKey): void;
}>();

const visible: ModelRef<boolean> = defineModel<boolean>('visible', {
  default: false,
});

const rules = {
  reference: {
    required,
  },
  type: {
    required,
  },
  secret: {
    required,
  },
};

const errorMessage = ref<string>();
const isBusy = ref<boolean>(false);
const defaultForm = {
  reference: props.reference !== undefined ? props.reference : '',
  isActive: true,
  secret: '',
  type: '',
  comment: undefined,
  expiration: null,
};
const form = ref<CreateAccessKey>({ ...defaultForm });
const v = useVuelidate(rules, form);
const handleError = (error: unknown): void => {
  errorMessage.value =
    error instanceof Error ? error.message : t(getI18nKey('error.fatal'));
};
const resetForm = (): void => {
  form.value = { ...defaultForm };
  v.value.$reset();
};
const resetContent = (): void => {
  errorMessage.value = undefined;
  resetForm();
};
const validateForm = async (): Promise<boolean> => {
  v.value.$validate();
  if (v.value.$invalid) {
    return false;
  }
  return true;
};
const getAccessKey = (): CreateAccessKey => {
  const accessKey: CreateAccessKey = {
    reference: form.value.reference,
    secret: form.value.secret,
    isActive: form.value.isActive,
    type: form.value.type,
  };
  if (form.value.expiration) {
    accessKey.expiration = getUnixTimestamp(form.value.expiration);
  } else {
    accessKey.expiration = undefined;
  }
  if (form.value.comment) {
    accessKey.comment = form.value.comment;
  }
  return accessKey;
};
const handleCreateAccessKey = async (): Promise<void> => {
  if (props.accessKeyService && !isBusy.value && (await validateForm())) {
    isBusy.value = true;
    try {
      const accessKey = getAccessKey();
      const accessKeyId =
        await props.accessKeyService.createAccessKey(accessKey);
      const createdAccessKey =
        await props.accessKeyService.getAccessKey(accessKeyId);
      emit('add-access-key', form.value.secret, createdAccessKey);
      visible.value = false;
    } catch (error) {
      handleError(error);
    } finally {
      isBusy.value = false;
    }
  }
};
const generateSecret = (): void => {
  form.value.secret = generateRandomString(16);
};
onErrorCaptured((err): boolean => {
  handleError(err.message);
  return false;
});
</script>
