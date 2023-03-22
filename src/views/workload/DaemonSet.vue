<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        :namespace="true"
        @namespaceChange="getNamespaceValue"
        @namespaceList="getNamespaceList"
        @dataList="getDaemonSetList"
        :add="true"
        @addFunc="handleAdd"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size: 12px"
          :loading="appLoading"
          :columns="columns"
          :dataSource="daemonSetList"
          :pagination="pagination"
          @change="handleTableChange">
        <template #bodyCell="{column, record}">
          <template v-if="column.dataIndex === 'name'">
            <span style="font-weight: bold">{{ record.metadata.name }}</span>
          </template>
          <template v-if="column.dataIndex === 'namespace'">
            <span>{{ record.metadata.namespace }}</span>
          </template>
          <template v-if="column.dataIndex === 'label'">
            <div v-for="(val, key) in record.metadata.labels" :key="key">
              <a-popover>
                <template #content>
                  <span>{{ key + ":" +val }}</span>
                </template>
                <a-tag style="margin-bottom:5px;cursor:pointer;" color="blue">{{ ellipsis(key + ":" +val, 15) }}</a-tag>
              </a-popover>
            </div>
          </template>
          <template v-if="column.dataIndex === 'image'">
            <div v-for="(val, key) in record.spec.template.spec.containers" :key="key">
              <a-popover>
                <template #content>
                  <span>{{ val.image }}</span>
                </template>
                <a-tag style="margin-bottom:5px;cursor:pointer;" color="geekblue">{{ ellipsis(val.image.split('/').pop() ? val.image.split('/').pop() : val.image, 15 ) }}</a-tag>
              </a-popover>
            </div>
          </template>
          <template v-if="column.dataIndex === 'createTime'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <a-button type="primary" @click="getDaemonSetDetail(record)" ghost>
              <FormOutlined />
              <span style="margin-left: 3px">详情</span>
            </a-button>
            <a-button danger style="margin-left: 5px" @click="showConfirm('删除', record, deleteDaemonSet)" ghost>
              <DeleteOutlined />
              <span style="margin-left: 3px">删除</span>
            </a-button>
            <a-button class="reload-btn" style="margin-top: 5px" type="primary" @click="showConfirm('重启', record, restartDaemonSet)" ghost>
              <ReloadOutlined />
              <span style="margin-left: 3px">重启</span>
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
    <a-modal
        v-model:visible="yamlModel"
        title="YAML信息"
        :confirm-loading="appLoading"
        cancelText="取消"
        okText="更新"
        @ok="updateDaemonSet">
      <codemirror
          :value="contentYaml"
          border
          :options="cmOptions"
          height="500"
          style="font-size:14px;"
          @change="onChange"
      ></codemirror>
    </a-modal>
    <a-drawer
        v-model:visible="createDrawer"
        title="创建DaemonSet"
        :footer-style="{ textAlign: 'right' }"
        @close="onClose">
      <br>
      <a-form ref="formRef" :model="daemonSetCreate" :labelCol="{style: {width: '30%'}}">
        <a-form-item
            label="名称"
            name="Name"
            :rules="[{ required: true, message: '请输入DaemonSet名称' }]">
          <a-input v-model:value="Name" />
        </a-form-item>
        <a-form-item
            label="命名空间"
            name="Namespace"
            :rules="[{ required: true, message: '请选择命名空间' }]">
          <a-select show-search style="width:140px;" v-model:value="Namespace" placeholder="请选择">
            <a-select-option
                v-for="(item, index) in namespaceList"
                :key="index"
                :value="item.metadata.name">
              {{ item.metadata.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
            label="镜像"
            name="Image"
            :rules="[{ required: true, message: '请输入镜像名' }]">
          <a-input v-model:value="Image" />
        </a-form-item>
        <a-form-item
            label="标签"
            name="Labels"
            :rules="[{ required: true, message: '请输入标签' }]">
          <a-input v-model:value="Labels" placeholder="app=gateway" />
        </a-form-item>
        <a-form-item
            label="资源配额"
            name="Resources"
            :rules="[{ required: true, message: '请选择资源规格' }]">
          <a-select show-search style="width:140px;" v-model:value="Resources" placeholder="请选择">
            <a-select-option value="0.5/1">0.5核/1G</a-select-option>
            <a-select-option value="1/2">1核/2G</a-select-option>
            <a-select-option value="2/4">2核/4G</a-select-option>
            <a-select-option value="4/8">4核/8G</a-select-option>
            <a-select-option value="8/16">8核/16G</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
            label="容器端口"
            name="Container_Port"
            :rules="[{ required: true, message: '请输入端口号' }]">
          <a-input v-model:value="Container_Port" />
        </a-form-item>
        <a-form-item
            label="健康检查"
            name="Health_Check">
          <a-switch v-model:checked="Health_Check" />
        </a-form-item>
        <a-form-item
            v-if="Health_Check"
            label="检测路径"
            name="Health_Path"
            :rules="[{ required: true, message: '请输入健康检测路径' }]">
          <a-input v-model:value="Health_Path" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button style="margin-right: 8px" @click="onClose()">取消</a-button>
        <a-button type="primary" @click="formSubmit()">创建</a-button>
      </template>
    </a-drawer>
  </div>
</template>

<script>
import CHeader from '@/components/CHeader'
import {createVNode, reactive, ref, toRefs} from "vue";
import common from "@/config";
import httpClient from '@/request';
import { message } from 'ant-design-vue';
import yaml2obj from 'js-yaml';
import json2yaml from 'json2yaml';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { Modal } from 'ant-design-vue';
export default {
  components: {
    CHeader
  },
  setup() {
    const searchValue = ref("");
    const namespaceValue = ref("");
    const namespaceList = ref([]);
    const appLoading = ref(false);
    const columns = ref([
      {
        title: '名称',
        dataIndex: 'name',
      },
      {
        title: '命名空间',
        dataIndex: 'namespace',
      },
      {
        title: '标签',
        dataIndex: 'label',
      },
      {
        title: '镜像',
        dataIndex: 'image',
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
      },
      {
        title: '操作',
        dataIndex: 'action',
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
    const contentYaml = ref("");
    const yamlModel = ref(false);
    const cmOptions = common.cmOptions;
    const daemonSetList = ref([]);
    const daemonSetListData = reactive({
      url: common.k8sDaemonSetList,
      params: {
        filter_name: '',
        namespace: '',
        cluster: '',
        page: 1,
        limit: 10,
      }
    })
    const daemonSetDetail = reactive({
      metadata: {},
    })
    const daemonSetDetailData = reactive({
      url: common.k8sDaemonSetDetail,
      params: {
        daemonset_name: '',
        namespace: '',
        cluster: '',
      }
    })
    const daemonSetUpdate = reactive({
      url: common.k8sDaemonSetUpdate,
      params: {
        namespace: '',
        cluster: '',
        content: '',
      }
    })
    const daemonSetRestart = reactive({
      url: common.k8sDaemonSetRestart,
      params: {
        namespace: '',
        cluster: '',
        daemonset_name: '',
      }
    })
    const daemonSetDelete = reactive({
      url: common.k8sDaemonSetDelete,
      params: {
        namespace: '',
        cluster: '',
        daemonset_name: '',
      }
    })
    const daemonSetCreate = reactive({
      Name: '',
      Namespace: '',
      Replicas: 1,
      Image: '',
      Resources: '',
      Health_Check: false,
      Health_Path: '',
      Labels: '',
      Container_Port: '',
    })
    const daemonSetCreateData = reactive({
      url: common.k8sDaemonSetCreate,
      params: {
        name: '',
        namespace: '',
        image: '',
        cpu: '',
        memory: '',
        health_check: false,
        health_path: '',
        label: {},
        container_port: '',
        cluster: ''
      }
    })
    const formRef = ref();
    const createDrawer = ref(false);

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
      getDaemonSetList()
    }
    function getSearchValue(val) {
      searchValue.value = val
    }
    function getNamespaceValue(val) {
      namespaceValue.value = val
    }
    function getNamespaceList(val) {
      namespaceList.value = val
    }
    function onChange(val) {
      contentYaml.value = val
    }
    function getDaemonSetList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      daemonSetListData.params.filter_name = searchValue.value
      daemonSetListData.params.namespace = namespaceValue.value
      daemonSetListData.params.page = pagination.currentPage
      daemonSetListData.params.limit = pagination.pageSize
      daemonSetListData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(daemonSetListData.url, {params: daemonSetListData.params}).then(res => {
        daemonSetList.value = res.data.items
        pagination.total = res.data.total
      }).catch(err => {
        message.error("获取DaemonSet列表失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function getDaemonSetDetail(e) {
      appLoading.value = true
      daemonSetDetailData.params.daemonset_name = e.metadata.name
      daemonSetDetailData.params.namespace = e.metadata.namespace
      daemonSetDetailData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(daemonSetDetailData.url, {params: daemonSetDetailData.params}).then(res => {
        contentYaml.value = transYaml(res.data)
        yamlModel.value = true
      }).catch(err => {
        message.error("获取DaemonSet详情失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function updateDaemonSet() {
      appLoading.value = true
      let content = JSON.stringify(transObj(contentYaml.value))
      daemonSetUpdate.params.namespace = namespaceValue.value
      daemonSetUpdate.params.content = content
      daemonSetUpdate.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.put(daemonSetUpdate.url, daemonSetUpdate.params).then(res => {
        message.success("更新DaemonSet成功")
      }).catch(err => {
        message.error("更新DaemonSet失败")
      }).finally(() => {
        getDaemonSetList()
        yamlModel.value = false
      })
    }
    function restartDaemonSet(e) {
      appLoading.value = true
      daemonSetRestart.params.daemonset_name = e.metadata.name
      daemonSetRestart.params.namespace = e.metadata.namespace
      daemonSetRestart.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.put(daemonSetRestart.url, daemonSetRestart.params).then(res => {
        message.success("重启DaemonSet成功")
      }).catch(err => {
        message.error("重启DaemonSet失败")
      }).finally(() => {
        getDaemonSetList()
      })
    }
    function deleteDaemonSet(e) {
      appLoading.value = true
      daemonSetDelete.params.daemonset_name = e.metadata.name
      daemonSetDelete.params.namespace = e.metadata.namespace
      daemonSetDelete.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.delete(daemonSetDelete.url, {data: daemonSetDelete.params}).then(res => {
        message.success("删除DaemonSet成功")
      }).catch(err => {
        message.error("删除DaemonSet失败")
      }).finally(() => {
        getDaemonSetList()
        appLoading.value = false
      })
    }
    function createDaemonSet() {
      let regex = new RegExp("(^[A-Za-z]+=[A-Za-z0-9]+).*")
      if (!regex.test(daemonSetCreate.Labels)) {
        message.warning("标签填写异常，请确认后重新填写")
      }

      appLoading.value = true

      let label = new Map ()
      let a = (daemonSetCreate.Labels).split(",")
      a.forEach(item => {
        let b = item.split("=")
        label[b[0]] = b[1]
      })
      let cpu, memory
      let resourceList = daemonSetCreate.Resources.split('/')
      cpu = resourceList[0]
      memory = resourceList[1] + "Gi"
      daemonSetCreateData.params.label = label
      daemonSetCreateData.params.cpu = cpu
      daemonSetCreateData.params.memory = memory
      daemonSetCreateData.params.name = daemonSetCreate.Name
      daemonSetCreateData.params.namespace = daemonSetCreate.Namespace
      daemonSetCreateData.params.image = daemonSetCreate.Image
      daemonSetCreateData.params.health_check = daemonSetCreate.Health_Check
      daemonSetCreateData.params.health_path = daemonSetCreate.Health_Path
      daemonSetCreateData.params.container_port = parseInt(daemonSetCreate.Container_Port)
      daemonSetCreateData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.post(daemonSetCreateData.url, daemonSetCreateData.params).then(res => {
        message.success("创建DaemonSet成功")
      }).catch(err => {
        message.error("创建DaemonSet失败")
      }).finally(() => {
        resetForm()
        getDaemonSetList()
        createDrawer.value = false
      })
      appLoading.value = true
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
    function handleAdd() {
      createDrawer.value = true
    }
    async function formSubmit() {
      try {
        await formRef.value.validateFields();
        createDaemonSet()
      } catch (errInfo) {
        console.log('Failed:', errInfo);
      }
    }
    function resetForm() {
      formRef.value.resetFields();
    }
    function onClose() {
      Modal.confirm({
        title: "是否确认关闭操作? ",
        icon: createVNode(ExclamationCircleOutlined),
        content: createVNode('div', {}),
        cancelText: '取消',
        okText: '确认',
        onOk() {
          createDrawer.value = false
          resetForm()
        },
        onCancel() {
          createDrawer.value = true
        }
      })
    }

    return {
      appLoading,
      pagination,
      columns,
      contentYaml,
      yamlModel,
      cmOptions,
      namespaceList,
      daemonSetList,
      daemonSetDetail,
      createDrawer,
      formRef,
      ...toRefs(daemonSetCreate),
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      getNamespaceValue,
      getNamespaceList,
      getDaemonSetList,
      getDaemonSetDetail,
      updateDaemonSet,
      daemonSetCreate,
      restartDaemonSet,
      deleteDaemonSet,
      showConfirm,
      handleAdd,
      onClose,
      onChange,
      formSubmit,
    }
  }
}
</script>

<style scoped>
  .ant-btn {
    border-radius: 1px;
  }
  .reload-btn {
    border-color: #ffe58f;
    color: #ffe58f;
  }
  .reload-btn:hover {
    border-color: #faad14;
    color: #faad14;
  }
  .reload-btn:active {
    border-color: #ffc53d;
    color: #ffc53d;
  }
  .reload-btn:focus {
    border-color: #faad14;
    color: #faad14;
  }
</style>