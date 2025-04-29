<template>
  <BaseModal
    id="infoAccessKeyModal"
    v-model:visible="visible"
    :title="t(getI18nKey('title.viewAccessKey'))"
    :busy="isBusy"
  >
    <div
      v-if="errorMessage"
      class="alert alert-danger text-center"
      role="alert"
      aria-live="assertive"
    >
      {{ $t(errorMessage) }}
    </div>
    <form
      id="updateForm"
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
        <ActiveInput v-model="form.isActive" />
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
        form="updateForm"
      >
        <span
          v-if="isBusy"
          class="spinner-border spinner-border-sm"
          role="status"
          aria-hidden="true"
        />
        {{ t(getI18nKey('button.updateAccessKey')) }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, watch, ModelRef, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { BaseModal } from '@mycore-org/vue-components';
import {
  AccessKey,
  PartialUpdateAccessKey,
  AccessKeyApiClient,
} from '@jsr/mycore__js-common/access-key';
import { getI18nKey, convertUnixToIso, getUnixTimestamp } from '@/common/utils';
import PermissionInput from './inputs/PermissionInput.vue';
import ReferenceInput from './inputs/ReferenceInput.vue';
import ActiveInput from './inputs/ActiveInput.vue';
import ExpirationInput from './inputs/ExpirationInput.vue';
import CommentInput from './inputs/CommentInput.vue';

interface FormData {
  reference: string;
  type: string;
  expiration: string | null;
  comment: string | undefined;
  isActive: boolean;
}

const { t } = useI18n();

const props = defineProps<{
  accessKey: AccessKey | undefined;
  accessKeyClient?: AccessKeyApiClient;
  permissions?: string[];
  reference?: string;
}>();

const visible: ModelRef<boolean> = defineModel<boolean>('visible', {
  default: false,
});

const emit = defineEmits<{
  (event: 'update-access-key', accessKey: AccessKey): void;
}>();

const errorMessage = ref<string | undefined>(undefined);
const isBusy = ref<boolean>(false);
const submitted = ref<boolean>(false);
const form = ref<FormData>({
  reference: '',
  type: '',
  isActive: false,
  comment: undefined,
  expiration: null,
});
const isReferenceValid = computed(() => form.value.reference.trim().length > 0);
const isPermissionValid = computed(() => form.value.type.trim().length > 0);

watch(
  () => props.accessKey,
  (accessKey?: AccessKey) => {
    if (accessKey) {
      form.value.type = accessKey.type;
      form.value.reference = accessKey.reference;
      form.value.isActive = accessKey.isActive;
      form.value.expiration = accessKey.expiration
        ? convertUnixToIso(accessKey.expiration)
        : null;
      form.value.comment = accessKey.comment;
    }
  }
);

const handleError = (error: unknown): void => {
  errorMessage.value =
    error instanceof Error ? error.message : t(getI18nKey('error.fatal'));
};
const buildAccessKeyPayload = (): PartialUpdateAccessKey => {
  const updatedAccessKey: PartialUpdateAccessKey = {};
  if (form.value.reference !== props.accessKey?.reference) {
    updatedAccessKey.reference = form.value.reference;
  }
  if (form.value.comment !== props.accessKey?.comment) {
    updatedAccessKey.comment = form.value.comment;
  }
  if (form.value.type !== props.accessKey?.type) {
    updatedAccessKey.type = form.value.type;
  }
  const expiration = form.value.expiration
    ? getUnixTimestamp(form.value.expiration)
    : null;
  if (expiration !== props.accessKey?.expiration) {
    updatedAccessKey.expiration = expiration;
  }
  if (form.value.isActive !== props.accessKey?.isActive) {
    updatedAccessKey.isActive = form.value.isActive;
  }
  return updatedAccessKey;
};

const validateFrom = (): boolean => {
  return isReferenceValid.value && isPermissionValid.value;
};

const handleSubmit = async (): Promise<void> => {
  if (isBusy.value) return;
  submitted.value = true;
  if (!validateFrom()) return;
  isBusy.value = true;
  if (props.accessKeyClient) {
    isBusy.value = true;
    if (props.accessKey) {
      const partialUpdatedAccessKey = buildAccessKeyPayload();
      try {
        await props.accessKeyClient.patchAccessKey(
          props.accessKey.id,
          partialUpdatedAccessKey
        );
        const updatedAccessKey = await props.accessKeyClient.getAccessKey(
          props.accessKey.id
        );
        emit('update-access-key', updatedAccessKey);
        visible.value = false;
      } catch (error) {
        handleError(error);
      } finally {
        isBusy.value = false;
      }
    } else {
      isBusy.value = false;
    }
  }
};
onErrorCaptured((err): boolean => {
  handleError(err);
  return false;
});
</script>
