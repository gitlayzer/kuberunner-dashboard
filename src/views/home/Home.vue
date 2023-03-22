<template xmlns="">
  <div>
    <a-spin :spinning="appLoading">
      <a-collapse v-model:activeKey="activeKey" ghost>
        <a-collapse-panel style="font-size: 18px;" key="1" header="概览">
          <a-row class="home-row1">
            <a-col :span="8">
              <div style="font-size: 13px">名称</div>
              <div style="text-align: center;font-size: 30px;font-weight: bold">KubeRunner</div>
            </a-col>
            <a-divider type="vertical" style="height: 70px; background-color: rgb(89,104,173)"></a-divider>
            <a-col :span="8">
              <div style="font-size: 13px">集群数量</div>
              <div style="text-align: center;font-size: 30px;font-weight: bold">{{ clusterNum }}</div>
            </a-col>
            <a-divider type="vertical" style="height: 70px; background-color: rgb(89,104,173)"></a-divider>
            <a-col :span="7">
              <div style="font-size: 13px">版本</div>
              <div style="text-align: center;font-size: 30px;font-weight: bold">v0.0.1</div>
            </a-col>
          </a-row>
          <a-row :gutter="10">
            <template v-for="(val, key) in resourceList" :key="key">
              <a-col :span="6" style="margin-bottom: 15px">
                <a-card :bordered="false" style="background-color: rgb(33, 46, 64)" :bodyStyle="{padding: '10px'}">
                  <div style="float: left;margin: 10px 10px 0">
                    <a-progress
                        :width="30"
                        :strokeWidth="18"
                        :stroke-color="color"
                        :percent="100"
                        :showInfo="false"
                        type="circle"
                        ></a-progress>
                  </div>
                  <div style="text-align: center">
                    <span style="font-size: 14px">{{ key }}</span>
                    <br>
                    <span style="font-size: 30px;font-weight: bold" >{{ val }}</span>
                  </div>
                </a-card>
              </a-col>
            </template>
          </a-row>
        </a-collapse-panel>
        <a-collapse-panel style="font-size: 18px;" key="2" header="事件">
          <div style="text-align: center; margin-bottom: 10px">
            <a-input-search
              allow-clear
              v-model:value="searchValue"
              placeholder="请输入资源名"
              @search="getEventList"
            >
            </a-input-search>
          </div>
          <div style="margin-top: 10px; text-align: center">
            <a-card>
              <a-table
                  style="font-size: 12px"
                  :loading="appLoading"
                  :columns="columns"
                  :data-source="eventList"
                  :pagination="pagination"
                  @change="handleTableChange">
                <template #bodyCell="{column, record}">
                  <template v-if="column.dataIndex === 'name'">
                    <a-tooltip :title="record.name">
                      <span style="font-weight: bold;color: #40a9ff">{{ record.metadata.name.slice(0,15) + '...' }}</span>
                    </a-tooltip>
                  </template>
                  <template v-if="column.dataIndex === 'kind'">
                    <a-tooltip :title="record.name">
                      <span>{{ record.involvedObject.kind }}</span>
                    </a-tooltip>
                  </template>
                  <template v-if="column.dataIndex === 'namespace'">
                    <a-tooltip :title="record.name">
                      <span>{{ record.metadata.namespace }}</span>
                    </a-tooltip>
                  </template>
                  <template v-if="column.dataIndex === 'cluster'">
                    <a-tooltip :title="record.name">
                      <span>{{ record.source.host }}</span>
                    </a-tooltip>
                  </template>
                </template>
              </a-table>
            </a-card>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </a-spin>
  </div>
</template>

<script>
import {onMounted, reactive, ref} from "vue";
import common from "@/config";
import httpClient from "@/request";
import { message } from 'ant-design-vue';
  export default {
    setup() {
      const appLoading = ref(false);
      const activeKey = ref(['1', '2']);
      const clusterNum = ref(0)
      const resourceList = ref()
      const resourceListData = reactive({
        url: common.k8sResources,
        params: {
          cluster: ''
        }
      })
      const searchValue = ref('')
      const columns = ref([
        {
          title: '资源名',
          dataIndex: 'name',
          width: 180,
        },
        {
          title: '资源类型',
          dataIndex: 'kind',
          width: 150,
        },
        {
          title: '命名空间',
          dataIndex: 'namespace',
          width: 100,
        },
        {
          title: '状态',
          dataIndex: 'type',
          width: 100,
        },
        {
          title: '原因',
          dataIndex: 'reason',
          width: 100,
        },
        {
          title: '描述',
          dataIndex: 'message',
          width: 500,
        },
        {
          title: '集群',
          dataIndex: 'cluster',
          width: 200,
        },
      ])
      const pagination = reactive({
        showSizeChanger: true,
        showQuickJumper: true,
        total: 0,
        currentPage: 1,
        pageSize: 10,
        pageSizeOptions: ['10', '20', '30', '50'],
        showTotal: (total, range) => `共 ${total} 条`
      })
      const eventList = ref()
      const eventListData = reactive({
        url: common.k8sEventList,
        params: {
          filter_name: '',
          page: 1,
          limit: 10,
          cluster: '',
        }
      })

      function handleTableChange(val) {
        pagination.currentPage = val.current;
        pagination.pageSize = val.pageSize;
        getEventList()
      }

      function getEventList() {
        appLoading.value = true
        if (searchValue.value) {pagination.currentPage = 1}
        eventListData.params.filter_name = searchValue.value
        eventListData.params.page = pagination.currentPage
        eventListData.params.limit = pagination.pageSize
        eventListData.params.cluster = localStorage.getItem('k8s_cluster')
        httpClient.get(eventListData.url, {params: eventListData.params}).then(res => {
          eventList.value = res.data.items
          pagination.total = res.data.total
        }).catch(err => {
          message.info("选择集群后才能查看资源以及事件信息")
        }).finally(() => {
          appLoading.value = false
        })
      }

      function getresources() {
        appLoading.value = true
        resourceListData.params.cluster = localStorage.getItem('k8s_cluster')
        httpClient.get(resourceListData.url,{
          params: resourceListData.params
        }).then(res => {
          appLoading.value = false
          resourceList.value = res.data
        }).catch(err => {
          appLoading.value = true
        }).finally(() => {
          appLoading.value = false
        })
      }

      const color = reactive({
        '0%': '#07b9bc',
        '100%': '#109ee9',
      })

      onMounted(() => {
        getEventList()
        getresources()
        if (localStorage.getItem('clusterNum')) {
          clusterNum.value = localStorage.getItem('clusterNum')
        }
      })

      return {
        appLoading,
        activeKey,
        clusterNum,
        color,
        resourceList,
        searchValue,
        columns,
        eventList,
        pagination,
        handleTableChange,
        getEventList,
      }
    }
  };
</script>

<style scoped>
  .home-row1 {
    background-color: rgb(40,46,58) !important;
    padding: 20px;
    margin-bottom: 15px;
  }
</style>