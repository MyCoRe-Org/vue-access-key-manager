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
      <div class="col-md-6">
        <label for="inputPermission" class="form-label">
          {{ t(getI18nKey('label.permission')) }}
        </label>
        <select
          v-if="permissions && permissions.length > 0"
          id="inputPermission"
          v-model="form.type"
          class="form-select"
        >
          <option
            v-for="permissionValue in permissions"
            :key="permissionValue"
            :value="permissionValue"
          >
            {{ t(getI18nKey(`label.permission.${permissionValue}`)) }}
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
        @click="updateAccessKey"
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
import { ref, onErrorCaptured, watch, ModelRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import { BaseModal } from '@mycore-org/vue-components';
import {
  AccessKey,
  PartialUpdateAccessKey,
  AccessKeyService,
} from '@mycore-test/js-common/access-key';
import { getI18nKey, convertUnixToIso, getUnixTimestamp } from '@/common/utils';

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
  accessKeyService?: AccessKeyService;
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
const form = ref<FormData>({
  reference: '',
  type: '',
  isActive: false,
  comment: undefined,
  expiration: null,
});

const rules = {
  reference: { required },
  type: { required },
};

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

const v = useVuelidate(rules, form);
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
const updateAccessKey = async (): Promise<void> => {
  if (props.accessKeyService && !isBusy.value) {
    isBusy.value = true;
    v.value.$validate();
    if (!v.value.$invalid && props.accessKey) {
      const partialUpdatedAccessKey = buildAccessKeyPayload();
      try {
        await props.accessKeyService.patchAccessKey(
          props.accessKey.id,
          partialUpdatedAccessKey
        );
        const updatedAccessKey = await props.accessKeyService.getAccessKey(
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
