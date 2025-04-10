<template>
  <div class="row pb-2">
    <div class="col-12">
      <div class="text-end">
        <button
          class="btn btn-primary"
          :disabled="state.loading"
          @click="state.createModalVisible = true"
        >
          <i class="fa fa-plus" />
          {{ t(getI18nKey('button.showCreateAccessKeyModal')) }}
        </button>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-12">
      <div class="position-relative">
        <AccessKeyTable
          :access-keys="paginatedAccessKeys"
          @remove-access-key="deleteAccessKey"
          @view-access-key="openAccessKeyInfoModal"
        />
        <div
          id="loading-overlay"
          class="loading-overlay"
          :style="{ visibility: state.loading ? 'visible' : 'hidden' }"
        >
          <div class="spinner-border text-primary" role="status"></div>
        </div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-12 d-flex justify-content-center">
      <Pagination
        v-model="state.currentPage"
        :total-rows="state.totalCount"
        :per-page="state.pageSize"
        @change-page="changePage"
      />
    </div>
  </div>
  <CreateAccessKeyModal
    v-model:visible="state.createModalVisible"
    :access-key-service="accessKeyService"
    :reference="reference"
    :permissions="permissions"
    @add-access-key="addAccessKey"
  />
  <AccessKeyInfoModal
    v-model:visible="state.infoModalVisible"
    :access-key="state.selectedAccessKey"
    :access-key-service="accessKeyService"
    :permissions="permissions"
    :reference="reference"
    @update-access-key="updateAccessKey"
  />
  <ConfirmModal />
</template>

<script setup lang="ts">
import { ref, onMounted, onErrorCaptured, computed, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { urlEncode } from '@/common/utils';
import { AccessKey, AccessKeyService } from '@mycore/js-common/access-key';
import AccessKeyTable from './AccessKeyTable.vue';
import AccessKeyInfoModal from './AccessKeyInfoModal.vue';
import CreateAccessKeyModal from './CreateAccessKeyModal.vue';
import {
  SimplePagination as Pagination,
  ConfirmModal,
  useConfirmModal,
} from '@mycore-org/vue-components';
import { fetchJwt } from '@/common/auth';
import { AuthStrategy, AccessTokenAuthStrategy } from '@mycore/js-common/auth';
import { getI18nKey } from '@/common/utils';

const router = useRouter();
const route = useRoute();

interface ManagerProps {
  baseUrl: string;
  authStrategy?: AuthStrategy;
  reference?: string;
  permissions?: string[];
  allowedSessionPermissions?: string[];
  currentPage?: number;
  pageSize?: number;
  routerEnabled?: boolean;
}

const props = withDefaults(defineProps<ManagerProps>(), {
  reference: undefined,
  permissions: undefined,
  allowedSessionPermissions: undefined,
  authStrategy: undefined,
  currentPage: 1,
  pageSize: 8,
  routerEnabled: false,
});

const emit = defineEmits<{
  (event: 'error', error: unknown): void;
  (event: 'page-change', page: number): void;
}>();

const { t } = useI18n();
const { confirm } = useConfirmModal();

const state = reactive({
  loading: false,
  totalCount: 0,
  currentPage: props.currentPage,
  pageSize: props.pageSize,
  accessKeys: [] as AccessKey[],
  selectedAccessKey: undefined as AccessKey | undefined,
  createModalVisible: false,
  infoModalVisible: false,
});
const accessKeyService = ref<AccessKeyService>();

const paginatedAccessKeys = computed(() =>
  state.accessKeys.slice(0, state.pageSize)
);
const fetchAccessKeys = async (): Promise<void> => {
  if (accessKeyService.value) {
    const offset = (state.currentPage - 1) * state.pageSize;
    const result = await accessKeyService.value.getAccessKeys({
      permissions: props.permissions,
      reference: props.reference,
      offset,
      limit: state.pageSize,
    });
    state.accessKeys = result.accessKeys;
    state.totalCount = result.totalCount;
  }
};
const openAccessKeyInfoModal = (index: number): void => {
  state.selectedAccessKey = paginatedAccessKeys.value[index];
  state.infoModalVisible = true;
};
const changePage = async (page: number): Promise<void> => {
  state.loading = true;
  state.currentPage = page;
  await fetchAccessKeys();
  state.loading = false;
  emit('page-change', page);
  if (props.routerEnabled) {
    router.push({
      query: {
        ...route.query,
        page: page.toString(),
      },
    });
  }
};
const deleteAccessKey = async (accessKey: AccessKey): Promise<void> => {
  const title = t(getI18nKey('confirmRemove.title'));
  const message = t(getI18nKey('confirmRemove.text'), {
    secret:
      accessKey.id.length > 30
        ? `${accessKey.id.slice(0, 27)}...`
        : accessKey.secret,
  });
  if (await confirm(title, message)) {
    state.loading = true;
    try {
      await accessKeyService.value?.deleteAccessKey(accessKey.id);
      state.accessKeys = state.accessKeys.filter(
        (a: AccessKey) => a.id !== accessKey.id
      );
      state.totalCount -= 1;
    } finally {
      state.loading = false;
    }
  }
};
const updateAccessKey = (accessKey: AccessKey): void => {
  const index = state.accessKeys.findIndex(
    (a: AccessKey) => a.id === accessKey.id
  );
  if (index !== -1) {
    state.accessKeys[index] = accessKey;
  }
  state.infoModalVisible = false;
};

const getActivationLink = (secret: string): string =>
  t(getI18nKey('success.add.url.format'), {
    baseUrl: props.baseUrl,
    reference: props.reference ?? '',
    secret: urlEncode(secret),
  });

const addAccessKey = async (
  secret: string,
  accessKey: AccessKey
): Promise<void> => {
  let message = t(getI18nKey('success.add'), {
    secret,
  });
  if (props.allowedSessionPermissions?.includes(accessKey.type)) {
    message = message.concat(
      ' ',
      t(getI18nKey('success.add.url')),
      ' ',
      getActivationLink(secret)
    );
  }
  state.totalCount += 1;
  state.accessKeys.push(accessKey);
  await confirm('Access Key created', message, { okOnly: true });
};
const initAccessKeyService = async () => {
  const authStrategy = !props.authStrategy
    ? new AccessTokenAuthStrategy(
        await fetchJwt(
          props.baseUrl,
          props.reference,
          props.allowedSessionPermissions !== undefined
        )
      )
    : props.authStrategy;
  accessKeyService.value = new AccessKeyService(
    props.baseUrl,
    () => authStrategy
  );
};
const handleError = (error: unknown): void => {
  emit('error', error);
};
onMounted(async (): Promise<void> => {
  try {
    state.loading = true;
    await initAccessKeyService();
    await fetchAccessKeys();
  } catch (error) {
    handleError(error);
  } finally {
    state.loading = false;
  }
});
onErrorCaptured((error): void => {
  handleError(error);
});
</script>

<style scoped>
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  visibility: hidden;
}
.table-container {
  position: relative;
  display: inline-block;
}
</style>
