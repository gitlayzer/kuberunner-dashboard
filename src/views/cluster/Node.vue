<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        @dataList="getNodeList"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size:12px;"
          :loading="appLoading"
          :columns="columns"
          :dataSource="nodeList"
          :pagination="pagination"
          @change="handleTableChange">
        <template #bodyCell="{column, record}">
          <template v-if="column.dataIndex === 'name'">
            <span style="font-weight: bold;">{{ record.metadata.name }}</span>
            <br>
            <span style="color: rgb(84, 138, 238);font-size: 5px;font-weight: bold">{{ record.status.addresses[0].address }}</span>
          </template>
          <template v-if="column.dataIndex === 'standard'">
            <span>{{ record.status.capacity.cpu }}核{{ specTrans(record.status.capacity.memory) }}G</span>
          </template>
          <template v-if="column.dataIndex === 'podCidr'">
            <a-tag color="geekblue">{{ record.spec.podCIDR }}</a-tag>
          </template>
          <template v-if="column.dataIndex === 'version'">
            <span style="color:rgb(13, 173, 231);">{{ record.status.nodeInfo.kubeletVersion }} </span>
          </template>
          <template v-if="column.dataIndex === 'creationTimestamp'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script>
import { reactive, ref } from 'vue';
import CHeader from "@/components/CHeader";
import httpClient from '@/request';
import common from "@/config";
import { message } from 'ant-design-vue';
export default {
  components: {
    CHeader
  },
  setup() {
    const columns = ref([
      {
        title: '名称',
        dataIndex: 'name'
      },
      {
        title: '规格',
        dataIndex: 'standard'
      },
      {
        title: 'POD-CIDR',
        dataIndex: 'podCidr',
      },
      {
        title: '版本',
        dataIndex: 'version',
      },
      {
        title: '创建时间',
        dataIndex: 'creationTimestamp'
      },
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
    const nodeList = ref([])
    const nodeListData = reactive({
      url : common.k8sNodeList,
      params: {
        filter_name: '',
        cluster: '',
        page: 1,
        limit: 10
      }
    })
    function specTrans(str) {
      if ( str.indexOf('Ki') === -1 ) {
        return str
      }
      let num = str.slice(0,-2) / 1024 / 1024
      return num.toFixed(0)
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
      getNodeList()
    }
    function getSearchValue(val) {
      searchValue.value = val
    }
    function getNodeList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      nodeListData.params.filter_name = searchValue.value
      nodeListData.params.cluster = localStorage.getItem('k8s_cluster')
      nodeListData.params.page = pagination.currentPage
      nodeListData.params.limit = pagination.pagesize
      httpClient.get(nodeListData.url, {params: nodeListData.params})
          .then(res => {
            //响应成功，获取node列表和total
            nodeList.value = res.data.items
            pagination.total = res.data.total
          })
          .catch(res => {
            message.error(res.msg)
          })
          .finally(() => {
            appLoading.value = false
          })
    }

    return {
      appLoading,
      pagination,
      columns,
      nodeList,
      contentYaml,
      yamlModal,
      cmOptions,
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      getNodeList,
      specTrans
    }
  }
};
</script>

<style scoped>

</style>