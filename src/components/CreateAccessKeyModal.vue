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
    <form
      ref="formRef"
      class="row g-3"
      novalidate
      @submit.prevent="handleSubmit"
    >
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
          required
          :class="{ 'is-invalid': submitted && !form.reference }"
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
            required
            :class="{ 'is-invalid': submitted && !form.secret }"
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
          required
          :class="{ 'is-invalid': submitted && !form.type }"
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
          required
          :class="{ 'is-invalid': submitted && !form.type }"
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
            :min="today"
            type="date"
            class="form-control"
            @keydown.prevent
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
        :disabled="isBusy"
        @click="submitForm"
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
import {
  getI18nKey,
  generateRandomString,
  getUnixTimestamp,
  today,
} from '@/common/utils';
import {
  AccessKey,
  CreateAccessKey,
  AccessKeyApiClient,
} from '@jsr/mycore__js-common/access-key';
import { BaseModal } from '@mycore-org/vue-components';

const { t } = useI18n();

const props = defineProps<{
  accessKeyClient?: AccessKeyApiClient;
  reference?: string;
  permissions?: string[];
}>();

const emit = defineEmits<{
  (event: 'add-access-key', secret: string, accessKey: AccessKey): void;
}>();

const visible: ModelRef<boolean> = defineModel<boolean>('visible', {
  default: false,
});

const defaultForm = {
  reference: props.reference !== undefined ? props.reference : '',
  isActive: true,
  secret: '',
  type: '',
  comment: undefined,
  expiration: null,
};

const submitted = ref<boolean>(false);
const form = ref<CreateAccessKey>({ ...defaultForm });
const formRef = ref<HTMLFormElement | null>(null);

const errorMessage = ref<string>();
const isBusy = ref<boolean>(false);
const handleError = (error: unknown): void => {
  errorMessage.value =
    error instanceof Error ? error.message : t(getI18nKey('error.fatal'));
};
const resetForm = (): void => {
  form.value = { ...defaultForm };
};
const resetContent = (): void => {
  errorMessage.value = undefined;
  resetForm();
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

const handleSubmit = async (): Promise<void> => {
  submitted.value = true;
  if (isBusy.value || !formRef.value?.checkValidity()) return;
  if (props.accessKeyClient) {
    isBusy.value = true;
    try {
      const accessKey = getAccessKey();
      const accessKeyId =
        await props.accessKeyClient.createAccessKey(accessKey);
      const createdAccessKey =
        await props.accessKeyClient.getAccessKey(accessKeyId);
      emit('add-access-key', form.value.secret, createdAccessKey);
      submitted.value = false;
      visible.value = false;
    } catch (error) {
      handleError(error);
    } finally {
      isBusy.value = false;
    }
  }
};
const submitForm = () => {
  formRef.value?.requestSubmit();
};
const generateSecret = (): void => {
  form.value.secret = generateRandomString(16);
};
onErrorCaptured((err): boolean => {
  handleError(err.message);
  return false;
});
</script>
