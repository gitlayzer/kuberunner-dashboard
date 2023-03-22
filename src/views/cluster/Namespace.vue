<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        @dataList="getNamespaceList"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size:12px;"
          :loading="appLoading"
          :columns="columns"
          :dataSource="namespaceList"
          :pagination="pagination"
          @change="handleTableChange">>
        <template #bodyCell="{column, record}">
          <template v-if="column.dataIndex === 'name'">
            <span style="font-weight: bold;">{{ record.metadata.name }}</span>
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
          <template v-if="column.dataIndex === 'status'">
            <span :class="[record.status.phase === 'Active' ? 'success-status' : 'error-status']">{{ record.status.phase }}</span>
          </template>
          <template v-if="column.dataIndex === 'creationTimestamp'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <a-button danger style="margin-left: 5px" @click="showConfirm('删除', record, deleteNamespace)" ghost>
              <DeleteOutlined />
              <span style="margin-left: 3px">删除</span>
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script>
import { createVNode, reactive, ref } from 'vue';
import CHeader from "@/components/CHeader";
import httpClient from '@/request';
import common from "@/config";
import { message } from 'ant-design-vue';
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
        title: '状态',
        dataIndex: 'status',
      },
      {
        title: '创建时间',
        dataIndex: 'creationTimestamp'
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
    const createDrawer = ref(false);
    const formRef = ref();
    const namespaceList = ref([])
    const namespaceListData = reactive({
      url : common.k8sNamespaceList,
      params: {
        filter_name: '',
        cluster: '',
        page: 1,
        limit: 10
      }
    })
    const contentYaml = ref('')
    const yamlModal = ref(false)
    const cmOptions = common.cmOptions
    const deleteNamespaceData = reactive({
      url: common.k8sNamespaceDelete,
      params: {
        namespace_name: '',
        namespace: '',
        cluster: ''
      }
    })

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
      getNamespaceList()
    }
    function getSearchValue(val) {
      searchValue.value = val
    }
    function getNamespaceList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      namespaceListData.params.filter_name = searchValue.value
      namespaceListData.params.cluster = localStorage.getItem('k8s_cluster')
      namespaceListData.params.page = pagination.currentPage
      namespaceListData.params.limit = pagination.pagesize
      httpClient.get(namespaceListData.url, {params: namespaceListData.params}).then(res => {
        namespaceList.value = res.data.items
        pagination.total = res.data.total
      }).catch(res => {
        message.error("获取Namespace列表失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function deleteNamespace(e) {
      appLoading.value = true
      deleteNamespaceData.params.namespace_name = e.metadata.name
      deleteNamespaceData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.delete(deleteNamespaceData.url, {data: deleteNamespaceData.params}).then(res => {
        message.success("删除Namespace成功")
      }).catch(res => {
        message.error("删除Namespace失败")
      }).finally(() => {
        getNamespaceList()
        appLoading.value = false
      })
    }
    function showConfirm(action, res, fn) {
      Modal.confirm({
        title: '是否继续' + action + "操作? 操作对象：",
        icon: createVNode(ExclamationCircleOutlined),
        content: createVNode("div", {
          style: {
            color: '#f00',
            fontWeight: 'bold'
          }
        }, res.metadata.name),
        cancelText: '取消',
        okText: '确认',
        onOk() {
          fn(res)
        },
      })
    }

    return {
      appLoading,
      pagination,
      columns,
      namespaceList,
      contentYaml,
      yamlModal,
      cmOptions,
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      getNamespaceList,
      deleteNamespace,
      showConfirm,
      createDrawer,
      formRef,
    }
  }
};
</script>

<style scoped>

</style>