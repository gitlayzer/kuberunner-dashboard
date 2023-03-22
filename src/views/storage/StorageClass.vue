<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        @dataList="getStorageClassList"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size:12px;"
          :loading="appLoading"
          :columns="columns"
          :dataSource="storageClassList"
          :pagination="pagination"
          @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'name'">
            <span style="font-weight: bold;color: white">{{ record.metadata.name }}</span>
          </template>
          <template v-if="column.dataIndex === 'labels'">
            <div v-for="(val, key) in record.metadata.labels" :key="key">
              <a-popover>
                <template #content>
                  <span>{{ key + ":" +val }}</span>
                </template>
                <a-tag style="margin-bottom:5px;cursor:pointer;" color="blue">{{ ellipsis(key + ":" +val, 15) }}</a-tag>
              </a-popover>
            </div>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <a-button type="primary" @click="getStorageClassDetail(record)" ghost>
              <FormOutlined />
              <span style="margin-left: 3px">详情</span>
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
    <a-modal
        v-model:visible="yamlModal"
        title="YAML信息"
        :confirm-loading="appLoading"
        cancelText="取消"
        okText="更新"
        :ok-button-props="{ disabled: true }">
      <codemirror
          :value="contentYaml"
          border
          :options="cmOptions"
          height="500"
          style="font-size:14px;"
          @change="onChange"
      ></codemirror>
    </a-modal>
  </div>
</template>

<script>
import { reactive, ref } from 'vue';
import CHeader from '@/components/CHeader';
import httpClient from '@/request';
import common from "@/config";
import { message } from 'ant-design-vue';
import json2yaml from 'json2yaml';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { Modal } from 'ant-design-vue';
export default {
  components: {
    CHeader,
  },
  setup() {
    const columns = ref([
      {
        title: '名称',
        dataIndex: 'name'
      },
      {
        title: '标签',
        dataIndex: 'labels'
      },
      {
        title: 'Provisioner',
        dataIndex: 'provisioner'
      },
      {
        title: 'ReclaimPolicy',
        dataIndex: 'reclaimPolicy',
      },
      {
        title: 'VolumeBindingMode',
        dataIndex: 'volumeBindingMode',
      },
      {
        title: '操作',
        dataIndex: 'action',
        fixed: 'right',
        width: 200
      }
    ])
    const appLoading = ref(false)
    const searchValue = ref('')
    const pagination = reactive({
      showSizeChanger: true,
      showQuickJumper: true,
      total: 0,
      currentPage: 1,
      pagesize: 10,
      pageSizeOptions: ["10", "20", "50", "100"],
      showTotal: total => `共 ${total} 条`
    })
    const contentYaml = ref('')
    const yamlModal = ref(false)
    const cmOptions = common.cmOptions
    const storageClassList = ref([])
    const storageClassListData = reactive({
      url: common.k8sStorageClassList,
      params: {
        filter_name: '',
        page: 1,
        limit: 10,
        cluster: ''
      }
    })
    const storageClassDetail = reactive({
      metadata: {}
    })
    const storageClassDetailData = reactive({
      url: common.k8sStorageClassDetail,
      params: {
        storageclass_name: '',
        cluster: ''
      }
    })

    function transYaml(content) {
      return json2yaml.stringify(content)
    }
    function timeTrans(timestamp) {
      let date = new Date(new Date(timestamp).getTime() + 8 * 3600 * 1000)
      date = date.toJSON();
      date = date.substring(0, 19).replace('T', ' ')
      return date
    }
    function ellipsis (val, len) {
      return val.length > len ? val.substring(0,len) + '...' : val
    }
    function handleTableChange(val) {
      pagination.currentPage = val.current
      pagination.pagesize = val.pageSize
      getStorageClassList()
    }
    function getSearchValue(val) {
      searchValue.value = val
    }
    function onChange(val) {
      contentYaml.value = val
    }
    function getStorageClassList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      storageClassListData.params.filter_name = searchValue.value
      storageClassListData.params.page = pagination.currentPage
      storageClassListData.params.limit = pagination.pagesize
      storageClassListData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(storageClassListData.url, {params: storageClassListData.params}).then(res => {
        storageClassList.value = res.data.items
        pagination.total = res.data.total
      }).catch(err => {
        message.error("获取StorageClass列表失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function getStorageClassDetail(e) {
      appLoading.value = true
      storageClassDetailData.params.storageclass_name = e.metadata.name
      storageClassDetailData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(storageClassDetailData.url, {params: storageClassDetailData.params}).then(res => {
        contentYaml.value = transYaml(res.data)
        yamlModal.value = true
      }).catch(err => {
        message.error("获取StorageClass详情失败")
      }).finally(() => {
        appLoading.value = false
      })
    }

    return {
      appLoading,
      pagination,
      columns,
      contentYaml,
      yamlModal,
      cmOptions,
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      onChange,
      storageClassList,
      storageClassDetail,
      getStorageClassList,
      getStorageClassDetail,
    }
  }
};
</script>

<style scoped>

</style>