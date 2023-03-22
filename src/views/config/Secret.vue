<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        namespace
        @namespaceChange="getNamespaceValue"
        @dataList="getSecretList"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size:12px;"
          :loading="appLoading"
          :columns="columns"
          :dataSource="secretList"
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
          <template v-if="column.dataIndex === 'type'">
            <span style="color: rgb(84, 138, 238);font-weight:bold;">{{ record.type }} </span>
          </template>
          <template v-if="column.dataIndex === 'creationTimestamp'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="primary" @click="getSecretDetail(record)" ghost>
              <FormOutlined />
              <span style="margin-left: 3px">详情</span>
            </a-button>
            <a-button danger style="margin-left: 5px" @click="showConfirm('删除', record, deleteSecret)" ghost>
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
        @ok="updateSecret">
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
        dataIndex: 'name'
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
        title: '类型',
        dataIndex: 'type'
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
    const secretList = ref([])
    const secretListData = reactive({
      url: common.k8sSecretList,
      params: {
        filter_name: '',
        namespace: '',
        cluster: '',
        page: 1,
        limit: 10
      }
    })
    const secretDetail =  reactive({
      metadata: {}
    })
    const secretDetailData =  reactive({
      url: common.k8sSecretDetail,
      params: {
        secret_name: '',
        namespace: '',
        cluster: ''
      }
    })
    const secretUpdateData = reactive({
      url: common.k8sSecretUpdate,
      params: {
        namespace: '',
        content: '',
        cluster: ''
      }
    })
    const secretDeleteData = reactive({
      url: common.k8sSecretDelete,
      params: {
        secret_name: '',
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
      getSecretList()
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
    function getSecretList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      secretListData.params.filter_name = searchValue.value
      secretListData.params.page = pagination.currentPage
      secretListData.params.limit = pagination.pagesize
      secretListData.params.namespace = namespaceValue.value
      secretListData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(secretListData.url,{params: secretListData.params}).then(res => {
        secretList.value = res.data.items
        pagination.total = res.data.total
      }).catch(err => {
        message.error("获取Secret列表失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function getSecretDetail(e) {
      appLoading.value = true
      secretDetailData.params.secret_name = e.metadata.name
      secretDetailData.params.namespace = e.metadata.namespace
      secretDetailData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(secretDetailData.url,{params: secretDetailData.params}).then(res => {
        contentYaml.value = transYaml(res.data)
        yamlModal.value = true
      }).catch(err => {
        message.error("获取Secret详情失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function updateSecret() {
      appLoading.value = true
      let content = JSON.stringify(transObj(contentYaml.value))
      secretUpdateData.params.namespace = namespaceValue.value
      secretUpdateData.params.content = content
      secretUpdateData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.put(secretUpdateData.url,secretUpdateData.params).then(res => {
        message.success("更新Secret成功")
      }).catch(err => {
        message.error("更新Secret失败")
      }).finally(() => {
        getSecretList()
        yamlModal.value = false
      })
    }
    function deleteSecret(e) {
      appLoading.value = true
      secretDeleteData.params.secret_name = e.metadata.name
      secretDeleteData.params.namespace = e.metadata.namespace
      secretDeleteData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.delete(secretDeleteData.url, {data: secretDeleteData.params}).then(res => {
        message.success("删除Secret成功")
      }).catch(res => {
        message.error("删除Secret失败")
      }).finally(() => {
        getSecretList()
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
      secretList,
      secretDetail,
      contentYaml,
      yamlModal,
      cmOptions,
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      getNamespaceValue,
      getSecretList,
      getSecretDetail,
      onChange,
      updateSecret,
      showConfirm,
      deleteSecret
    }
  }
};
</script>

<style scoped>

</style>