<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        @dataList="getPersistentVolumeList"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size:12px;"
          :loading="appLoading"
          :columns="columns"
          :dataSource="persistentVolumeList"
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
          <template v-if="column.dataIndex === 'status'">
            <span style="font-weight: bold" :class="[record.status.phase === 'Bound' ? 'success-status' : 'error-status']">{{ record.status.phase }}</span>
          </template>
          <template v-if="column.dataIndex === 'storage'">
            <span style="font-weight: bold;color: #52c41a">{{ record.spec.capacity.storage }}</span>
          </template>
          <template v-if="column.dataIndex === 'accessMode'">
            <span style="color: rgb(84, 138, 238);font-weight:bold;">{{ record.spec.accessModes[0] }}</span>
          </template>
          <template v-if="column.dataIndex === 'creationTimestamp'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <a-button type="primary" @click="getPersistentVolumeDetail(record)" ghost>
              <FormOutlined />
              <span style="margin-left: 3px">详情</span>
            </a-button>
            <a-button danger style="margin-left: 5px" @click="showConfirm('删除', record, deletePersistentVolume)" ghost>
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
import { createVNode, reactive, ref } from 'vue';
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
        title: '状态',
        dataIndex: 'status'
      },
      {
        title: '容量',
        dataIndex: 'storage',
      },
      {
        title: '访问模式',
        dataIndex: 'accessMode',
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
    const contentYaml = ref('')
    const yamlModal = ref(false)
    const cmOptions = common.cmOptions
    const persistentVolumeList = ref([])
    const persistentVolumeListData = reactive({
      url: common.k8sPersistentVolumeList,
      params: {
        filter_name: '',
        cluster: '',
        page: 1,
        limit: 10
      }
    })
    const persistentVolumeDetail = reactive({
      metadata: {},
    })
    const persistentVolumeDetailData = reactive({
      url: common.k8sPersistentVolumeDetail,
      params: {
        persistentvolume_name: '',
        cluster: ''
      }
    })
    const persistentVolumeDeleteData = reactive({
      url: common.k8sPersistentVolumeDelete,
      params: {
        persistentvolume_name: '',
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
      getPersistentVolumeList()
    }
    function getSearchValue(val) {
      searchValue.value = val
    }
    function onChange(val) {
      contentYaml.value = val
    }
    function getPersistentVolumeList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      persistentVolumeListData.params.filter_name = searchValue.value
      persistentVolumeListData.params.page = pagination.currentPage
      persistentVolumeListData.params.limit = pagination.pagesize
      persistentVolumeListData.params.cluster = localStorage.getItem("k8s_cluster")
      httpClient.get(persistentVolumeListData.url,{params: persistentVolumeListData.params}).then(res => {
        persistentVolumeList.value = res.data.items
        pagination.total = res.data.total
      }).catch(err => {
        message.error("获取PersistentVolume列表失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function getPersistentVolumeDetail(e) {
      appLoading.value = true
      persistentVolumeDetailData.params.persistentvolume_name = e.metadata.name
      persistentVolumeDetailData.params.cluster = localStorage.getItem("k8s_cluster")
      httpClient.get(persistentVolumeDetailData.url,{params: persistentVolumeDetailData.params}).then(res => {
        contentYaml.value = transYaml(res.data)
        yamlModal.value = true
      }).catch(err => {
        message.error("获取PersistentVolume详情失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function deletePersistentVolume(e) {
      appLoading.value = true
      persistentVolumeDeleteData.params.persistentvolume_name = e.metadata.name
      persistentVolumeDeleteData.params.cluster = localStorage.getItem("k8s_cluster")
      httpClient.delete(persistentVolumeDeleteData.url,{data: persistentVolumeDeleteData.params}).then(res => {
        message.success("删除PersistentVolume成功")
      }).catch(err => {
        message.error("删除PersistentVolume失败")
      }).finally(() => {
        getPersistentVolumeList()
        appLoading.value = false
      })
    }
    function showConfirm(action, res, fn) {
      Modal.confirm({
        title: '是否继续' + action + "操作? 操作对象：",
        icon: createVNode(ExclamationCircleOutlined),
        content: createVNode('div', {
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
      contentYaml,
      yamlModal,
      cmOptions,
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      onChange,
      showConfirm,
      persistentVolumeList,
      persistentVolumeDetail,
      getPersistentVolumeList,
      getPersistentVolumeDetail,
      deletePersistentVolume
    }
  }
};
</script>

<style scoped>

</style>