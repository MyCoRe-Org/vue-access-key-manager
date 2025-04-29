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
      id="createForm"
      class="row g-3"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <div class="col-12">
        <ReferenceInput
          v-model="form.reference"
          :reference="reference"
          :invalid="submitted && !isReferenceValid"
        />
      </div>
      <div class="col-12">
        <SecretInput
          v-model="form.secret"
          :invalid="submitted && !isSecretValid"
        />
      </div>
      <div class="col-md-6">
        <PermissionInput
          v-model="form.type"
          :permissions="permissions"
          :invalid="submitted && !isPermissionValid"
        />
      </div>
      <div class="col-md-6">
        <ExpirationInput v-model="form.expiration" />
      </div>
      <div class="col-12">
        <ActiveInput id="inputActive" v-model="form.isActive" />
      </div>
      <div class="col-12">
        <CommentInput v-model="form.comment" />
      </div>
    </form>
    <template #modal-footer>
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="isBusy"
        form="createForm"
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
import { ref, ModelRef, onErrorCaptured, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getI18nKey, getUnixTimestamp } from '@/common/utils';
import {
  AccessKey,
  CreateAccessKey,
  AccessKeyApiClient,
} from '@jsr/mycore__js-common/access-key';
import { BaseModal } from '@mycore-org/vue-components';
import PermissionInput from './inputs/PermissionInput.vue';
import ReferenceInput from './inputs/ReferenceInput.vue';
import SecretInput from './inputs/SecretInput.vue';
import ActiveInput from './inputs/ActiveInput.vue';
import ExpirationInput from './inputs/ExpirationInput.vue';
import CommentInput from './inputs/CommentInput.vue';

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

const form = ref<CreateAccessKey>({ ...defaultForm });
const submitted = ref<boolean>(false);
const isReferenceValid = computed(() => form.value.reference.trim().length > 0);
const isSecretValid = computed(() => form.value.secret.trim().length > 0);
const isPermissionValid = computed(() => form.value.type.trim().length > 0);

const errorMessage = ref<string>();
const isBusy = ref<boolean>(false);
const handleError = (error: unknown): void => {
  errorMessage.value =
    error instanceof Error ? error.message : t(getI18nKey('error.fatal'));
};
const resetForm = (): void => {
  form.value = { ...defaultForm };
  submitted.value = false;
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

const validateFrom = (): boolean => {
  return (
    isReferenceValid.value && isSecretValid.value && isPermissionValid.value
  );
};

const handleSubmit = async (): Promise<void> => {
  if (isBusy.value) return;
  submitted.value = true;
  if (!validateFrom()) return;
  isBusy.value = true;
  if (props.accessKeyClient) {
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
onErrorCaptured((err): boolean => {
  handleError(err.message);
  return false;
});
</script>
