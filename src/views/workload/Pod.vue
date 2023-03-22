<template>
  <div>
    <c-header
        :namespace="true"
        :searchDescribe="'请输入'"
        @searchChange="getSearchValue"
        @namespaceChange="getNamespaceValue"
        @dataList="getPodList">
    </c-header>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
        style="font-size: 12px"
        :loading="appLoading"
        :columns="columns"
        :dataSource="podList"
        :pagination="pagination"
        @change="handleTableChange">
        <template #bodyCell="{column, record}">
          <template v-if="column.dataIndex === 'name'">
            <span style="font-weight: bold">{{ record.metadata.name }}</span>
          </template>
          <template v-if="column.dataIndex === 'node'">
            <span style="color: rgb(84, 138,238)">{{ record.spec.nodeName }}</span>
          </template>
          <template v-if="column.dataIndex === 'state'">
            <span style="color: rgb(84, 138,238)">
              <div
                  :class="{'succ-dot': record.status.phase === 'Running' || record.status.phase === 'Succeeded',
                  'warn-dot': record.status.phase === 'Pending',
                  'err-dot': record.status.phase === 'Failed'}">
              </div>
              <span
                  :class="{'succ-state': record.status.phase === 'Running' || record.status.phase === 'Succeeded',
                  'warn-state': record.status.phase === 'Pending',
                  'err-state': record.status.phase === 'Failed'}">
                {{ record.status.phase }}
              </span>
            </span>
          </template>
          <template v-if="column.dataIndex === 'restarts'">
            <span>{{ restartTotal(record) }}</span>
          </template>
          <template v-if="column.dataIndex === 'image'">
            <div v-for="(val, key) in record.spec.containers" :key="key">
              <a-popover>
                <template #content>
                  <span>{{ val.image }}</span>
                </template>
                <a-tag style="margin-bottom: 5px;cursor: pointer" color="geekblue">{{ ellipsis(val.image.split('/').pop() ? val.image.split('/').pop() : val.image, 15) }}</a-tag>
              </a-popover>
            </div>
          </template>
          <template v-if="column.dataIndex === 'creationTimestamp'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="primary" @click="getPodDetail(record)" ghost>
              <FormOutlined />
              <span style="margin-left: 3px">详情</span>
            </a-button>
            <a-button danger style="margin-left: 5px" @click="showConfirm('删除', record, deletePod)" ghost>
              <DeleteOutlined />
              <span style="margin-left: 3px">删除</span>
            </a-button>
            <a-button class="terminal-btn" style="margin-top: 5px" type="primary" @click="gotoTerminal(record) " ghost>
              <CodeOutlined />
              <span style="margin-left: 3px">终端</span>
            </a-button>
            <a-button class="log-btn" style="margin-left: 5px; margin-top: 5px" type="primary" @click="gotoPodLog(record) " ghost>
              <FileSearchOutlined />
              <span style="margin-left: 3px">日志</span>
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
    <a-modal
      v-model:visible="yamlModel"
      title="YAML信息"
      :confirm-Loading="appLoading"
      cancel-text="取消"
      okText="更新"
      @ok="updatePod"
    >
      <codemirror
        :value="contentYaml"
        :border="true"
        :options="cmOptions"
        height="500px"
        style="font-size: 14px"
        @change="onChange">
      </codemirror>
    </a-modal>
  </div>
</template>

<script>
  import CHeader from "@/components/CHeader";
  import {createVNode, reactive, ref} from "vue";
  import common from "@/config";
  import httpClient from "@/request";
  import { message } from "ant-design-vue";
  import json2yaml from "json2yaml";
  import yaml2obj from "js-yaml"
  import { ExclamationCircleOutlined } from "@ant-design/icons-vue";
  import { Modal } from "ant-design-vue";
  import router from "@/router";
  export default {
    components: {
      CHeader,
    },
    setup() {
      const searchValue = ref("");
      const namespaceValue = ref("");
      const appLoading = ref(false);
      const columns = ref([
        {
          title: "名称",
          dataIndex: "name",
        },
        {
          title:  "节点",
          dataIndex: "node",
        },
        {
          title: "状态",
          dataIndex: "state",
          width: 120,
        },
        {
          title: "重启次数",
          dataIndex: "restarts",
        },
        {
          title: "镜像",
          dataIndex: "image",
        },
        {
          title: "创建时间",
          dataIndex: "creationTimestamp",
        },
        {
          title: "操作",
          key: "action",
          fixed: "right",
          width: 200,
        },
      ])
      const pagination = reactive({
        showSizeChanger: true,
        showQuickJumper: true,
        total: 0,
        currentPage: 1,
        pageSize: 10,
        pageSizeOptions: ["10", "20", "30", "50"],
        showTotal: (total) => `共 ${total} 条`,
      })
      const podList = ref([]);
      const podListData = reactive({
        url: common.k8sPodList,
        params: {
          filter_name: '',
          namespace: '',
          cluster: '',
          page: 1,
          limit: 10,
        }
      })
      const contentYaml = ref("");
      const yamlModel = ref(false);
      const cmOptions = common.cmOptions;
      const podDetailData = reactive({
        url: common.k8sPodDetail,
        params: {
          pod_name: '',
          namespace: '',
          cluster: '',
        }
      })
      const updatePodData = reactive({
        url: common.k8sPodUpdate,
        params: {
          namespace: '',
          content: '',
          cluster: '',
        }
      })
      const deletePodData = reactive({
        url: common.k8sPodDelete,
        params: {
          namespace: '',
          pod_name: '',
          cluster: '',
        }
      })
      function transYaml(content) {
        return json2yaml.stringify(content)
      }
      function transObj(content) {
        return yaml2obj.load(content)
      }
      function onChange (val) {
        contentYaml.value = val;
      }
      function getNamespaceValue(val) {
        namespaceValue.value = val;
      }
      function timeTrans(timestamp){
        let date = new Date(new Date(timestamp).getTime() + 8 * 3600 * 1000);
        date = date.toJSON();
        date = date.substring(0,19).replace('T',' ');
        return date;
      }
      function ellipsis(val, len) {
        return val.length > len ? val.substring(0,len) + '...' : val;
      }
      function restartTotal(e) {
        let total = 0;
        e.status.containerStatuses.forEach(item => {
          total += item.restartCount;
        })
        return total;
      }
      function handleTableChange(val) {
        pagination.currentPage = val.current;
        pagination.pageSize = val.pageSize;
        getPodList()
      }
      function getSearchValue(val) {
        searchValue.value = val;
        pagination.currentPage = 1;
      }
      function getPodList() {
        appLoading.value = true;
        podListData.params.filter_name = searchValue.value;
        podListData.params.namespace = namespaceValue.value;
        podListData.params.page = pagination.currentPage;
        podListData.params.limit = pagination.pageSize;
        podListData.params.cluster = localStorage.getItem("k8s_cluster");
        httpClient.get(podListData.url, {params: podListData.params}).then(res => {
          podList.value = res.data.items;
          pagination.total = res.data.total;
        }).catch(err => {
          message.error(res.msg);
        }).finally(() => {
          appLoading.value = false;
        })
      }
      function getPodDetail(e) {
        appLoading.value = true;
        podDetailData.params.pod_name = e.metadata.name;
        podDetailData.params.namespace = e.metadata.namespace;
        podDetailData.params.cluster = localStorage.getItem("k8s_cluster");
        httpClient.get(podDetailData.url, {params: podDetailData.params}).then(res => {
          contentYaml.value = transYaml(res.data);
          yamlModel.value = true;
        }).catch(err => {
          message.error("获取Pod详情失败")
        }).finally(() => {
          appLoading.value = false;
        })
      }
      function updatePod() {
        appLoading.value = true;
        let content = JSON.stringify(transObj(contentYaml.value));
        updatePodData.params.namespace = namespaceValue.value;
        updatePodData.params.cluster = localStorage.getItem("k8s_cluster");
        updatePodData.params.content = content;
        httpClient.put(updatePodData.url, updatePodData.params).then(res => {
          message.success("更新成功");
        }).catch(err => {
          message.error("更新失败");
        }).finally(() => {
          getPodList();
          appLoading.value = false;
          yamlModel.value = false;
        })
      }
      function deletePod(e) {
        appLoading.value = true;
        deletePodData.params.pod_name = e.metadata.name;
        deletePodData.params.namespace = e.metadata.namespace;
        deletePodData.params.cluster = localStorage.getItem("k8s_cluster");
        httpClient.delete(deletePodData.url, {data: deletePodData.params}).then(res => {
          message.success("删除成功");
        }).catch(err => {
          message.error("删除失败");
        }).finally(() => {
          getPodList()
          appLoading.value = false;
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

      function gotoTerminal(record) {
        let routerUrl = router.resolve({
          path: "/workload/pod/terminal",
          query: {
            pod_name: record.metadata.name,
            namespace: record.metadata.namespace,
            cluster: localStorage.getItem("k8s_cluster"),
          }
        })
        window.open(routerUrl.href, "_blank");
      }

      function gotoPodLog(record) {
        let routerUrl = router.resolve({
          path: "/workload/pod/log",
          query: {
            pod_name: record.metadata.name,
            namespace: record.metadata.namespace,
            cluster: localStorage.getItem("k8s_cluster"),
          }
        })
        window.open(routerUrl.href, "_blank");
      }
      return {
        getSearchValue,
        getNamespaceValue,
        getPodList,
        appLoading,
        pagination,
        columns,
        podList,
        handleTableChange,
        restartTotal,
        ellipsis,
        timeTrans,
        contentYaml,
        yamlModel,
        cmOptions,
        onChange,
        getPodDetail,
        updatePod,
        deletePod,
        showConfirm,
        gotoTerminal,
        gotoPodLog,
      }
    },
  }
</script>

<style scoped>
  .pod-button {
    margin-bottom: 5px;
  }
  .ant-btn {
    border-radius: 1px;
  }
  .succ-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    background: #86c169;
    border-radius: 50%;
    border: 1px solid #88c06c;
    margin-right: 10px;
  }
  .warn-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    background: rgb(233, 200, 16);
    border-radius: 50%;
    border: 1px solid rgb(233, 200, 16);
    margin-right: 10px;
  }
  .err-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    background: rgb(199, 85, 85);
    border-radius: 50%;
    border: 1px solid rgb(199, 85, 85);
    margin-right: 10px;
  }
  .succ-state {
    color: rgb(27, 202, 21);
  }
  .warn-state {
    color: rgb(233, 200, 16);
  }
  .err-state {
    color: rgb(226, 23, 23);
  }

  .terminal-btn {
    border-color: #73d13d;
    color: #73d13d;
  }
  .terminal-btn:hover {
    border-color: #389e0d;
    color: #389e0d;
  }
  .terminal-btn:active {
    border-color: #52c41a ;
    color: #52c41a;
  }
  .terminal-btn:focus {
    border-color: #52c41a ;
    color: #52c41a;
  }
  .log-btn {
    border-color: #ffe58f;
    color: #ffe58f;
  }
  .log-btn:hover {
    border-color: #faad14;
    color: #faad14;
  }
  .log-btn:active {
    border-color: #ffc53d;
    color: #ffc53d;
  }
  .log-btn:focus {
    border-color: #faad14;
    color: #faad14;
  }
</style>