<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        namespace
        @namespaceChange="getNamespaceValue"
        @dataList="getConfigmapList"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size:12px;"
          :loading="appLoading"
          :columns="columns"
          :dataSource="configmapList"
          :pagination="pagination"
          @change="handleTableChange">
        <template #bodyCell="{ column, record }">
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
          <template v-if="column.dataIndex === 'data'">
            <a-popover
                :overlayStyle="{width:'520px'}">
              <template #content>
                <div style="width:500px;height:300px;word-break:break-all;overflow-y:auto;">{{ record.data }}</div>
              </template>
              <file-text-outlined style="font-size: 15px;" />
            </a-popover>
          </template>
          <template v-if="column.dataIndex === 'creationTimestamp'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="primary" @click="getConfigmapDetail(record)" ghost>
              <FormOutlined />
              <span style="margin-left: 3px">详情</span>
            </a-button>
            <a-button danger style="margin-left: 5px" @click="showConfirm('删除', record, deleteConfigmap)" ghost>
              <DeleteOutlined />
              <span style="margin-left: 3px">删除</span>
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
        @ok="updateConfigmap">
      <codemirror
          :value="contentYaml"
          border
          :options="cmOptions"
          height="500"
          style="font-size:14px;"
          @change="onChange">
      </codemirror>
    </a-modal>
  </div>
</template>

<script>
import { createVNode, reactive, ref } from 'vue';
import CHeader from '@/components/CHeader';
import httpClient from '@/request';
import common from "@/config";
import { message } from 'ant-design-vue';
import yaml2obj from 'js-yaml';
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
        dataIndex: 'name',
        width: 300
      },
      {
        title: '标签',
        dataIndex: 'labels'
      },
      {
        title: 'DATA',
        dataIndex: 'data',
      },
      {
        title: '创建时间',
        dataIndex: 'creationTimestamp'
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 200
      }
    ])
    const appLoading = ref(false)
    const searchValue = ref('')
    const namespaceValue = ref('')
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
    const configmapList = ref([])
    const configmapListData = reactive({
      url : common.k8sConfigMapList,
      params: {
        filter_name: '',
        namespace: '',
        cluster: '',
        page: 1,
        limit: 10
      }
    })
    const configmapDetail =  reactive({
      metadata: {}
    })
    const configmapDetailData =  reactive({
      url: common.k8sConfigMapDetail,
      params: {
        configmap_name: '',
        namespace: '',
        cluster: ''
      }
    })
    const configmapUpdateData = reactive({
      url: common.k8sConfigMapUpdate,
      params: {
        namespace: '',
        content: '',
        cluster: ''
      }
    })
    const configmapDeleteData = reactive({
      url: common.k8sConfigMapDelete,
      params: {
        configmap_name: '',
        namespace: '',
        cluster: ''
      }
    })

    function transYaml(content) {
      return json2yaml.stringify(content)
    }
    function transObj(content) {
      return yaml2obj.load(content)
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
      getConfigmapList()
    }
    function getSearchValue(val) {
      searchValue.value = val
    }
    function getNamespaceValue(val) {
      namespaceValue.value = val
    }
    function onChange(val) {
      contentYaml.value = val
    }
    function getConfigmapList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      configmapListData.params.filter_name = searchValue.value
      configmapListData.params.namespace = namespaceValue.value
      configmapListData.params.page = pagination.currentPage
      configmapListData.params.limit = pagination.pagesize
      configmapListData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(configmapListData.url, {params: configmapListData.params}).then(res => {
        configmapList.value = res.data.items
        pagination.total = res.data.total
      }).catch(res => {
        message.error("获取configmap列表失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function getConfigmapDetail(e) {
      appLoading.value = true
      configmapDetailData.params.configmap_name = e.metadata.name
      configmapDetailData.params.namespace = e.metadata.namespace
      configmapDetailData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(configmapDetailData.url, {params: configmapDetailData.params}).then(res => {
        contentYaml.value = transYaml(res.data)
        yamlModal.value = true
      }).catch(res => {
        message.error("获取configmap详情失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function updateConfigmap() {
      appLoading.value = true
      let content = JSON.stringify(transObj(contentYaml.value))
      configmapUpdateData.params.namespace = namespaceValue.value
      configmapUpdateData.params.content = content
      configmapUpdateData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.put(configmapUpdateData.url, configmapUpdateData.params).then(res => {
        message.success("更新configmap成功")
      }).catch(res => {
        message.error("更新configmap失败")
      }).finally(() => {
        getConfigmapList()
        yamlModal.value = false
      })
    }
    function deleteConfigmap(e) {
      appLoading.value = true
      configmapDeleteData.params.configmap_name = e.metadata.name
      configmapDeleteData.params.namespace = e.metadata.namespace
      configmapDeleteData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.delete(configmapDeleteData.url, {data: configmapDeleteData.params}).then(res => {
        message.success("删除configmap成功")
      }).catch(res => {
        message.error("删除configmap失败")
      }).finally(() => {
        getConfigmapList()
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
        cancelText: "取消",
        okText: "确定",
        onOk() {
          fn(res);
        },
      })
    }

    return {
      appLoading,
      pagination,
      columns,
      configmapList,
      configmapDetail,
      contentYaml,
      yamlModal,
      cmOptions,
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      getNamespaceValue,
      getConfigmapList,
      getConfigmapDetail,
      onChange,
      updateConfigmap,
      showConfirm,
      deleteConfigmap
    }
  }
};
</script>

<style scoped>

</style>