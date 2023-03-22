<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        :namespace="true"
        @namespaceChange="getNamespaceValue"
        @namespaceList="getNamespaceList"
        @dataList="getServiceList"
        :add="true"
        @addFunc="handleAdd"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size:12px;"
          :loading="appLoading"
          :columns="columns"
          :dataSource="serviceList"
          :pagination="pagination"
          @change="handleTableChange">
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
          <template v-if="column.dataIndex === 'type'">
            <span style="color: rgb(84, 138, 238);font-weight:bold;">{{ record.spec.type }} </span>
          </template>
          <template v-if="column.dataIndex === 'cluster-ip'">
            <span>{{ record.spec.clusterIP }} </span>
          </template>
          <template v-if="column.dataIndex === 'external-ip'">
            <span>{{ record.status.loadBalancer.svc ? record.status.loadBalancer.svc[0].ip : '' }} </span>
          </template>
          <template v-if="column.dataIndex === 'port'">
            <span v-if="!record.spec.ports[0].nodePort">{{ record.spec.ports[0].port }}/{{ record.spec.ports[0].protocol }}</span>
            <span v-if="record.spec.ports[0].nodePort">{{ record.spec.ports[0].port }}:{{ record.spec.ports[0].nodePort }}/{{ record.spec.ports[0].protocol }}</span>
          </template>
          <template v-if="column.dataIndex === 'creationTimestamp'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <a-button type="primary" @click="getServiceDetail(record)" ghost>
              <FormOutlined />
              <span style="margin-left: 3px">详情</span>
            </a-button>
            <a-button danger style="margin-left: 5px" @click="showConfirm('删除', record, deleteService)" ghost>
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
        @ok="updateService">
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
        title="创建Service"
        :footer-style="{ textAlign: 'right' }"
        @close="onClose">
      <br>
      <a-form ref="formRef" :model="serviceCreate" :labelCol="{style: {width: '30%'}}">
        <a-form-item
            label="名称"
            name="Name"
            :rules="[{ required: true, message: '请输入Service名称' }]">
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
            label="标签"
            name="Labels"
            :rules="[{ required: true, message: '请输入标签' }]">
          <a-input v-model:value="Labels" placeholder="version=v0.0.1,app=gateway" />
        </a-form-item>
        <a-form-item
            label="过滤器"
            name="Selector"
            :rules="[{ required: true, message: '请输入绑定的标签' }]">
          <a-input v-model:value="Selector" placeholder="app=nginx,version=v0.0.1" />
        </a-form-item>
        <a-form-item
            label="类型"
            name="Type"
            :rules="[{ required: true, message: '请输入类型' }]">
          <a-select style="width:140px;" v-model:value="Type" placeholder="请选择">
            <a-select-option value="ClusterIP">ClusterIP</a-select-option>
            <a-select-option value="NodePort">NodePort</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
            label="端口名称"
            name="PortsName"
            :rules="[{ required: true, message: '请输入端口名称' }]">
          <a-input v-model:value="PortsName" placeholder="http" />
        </a-form-item>
        <a-form-item
            label="Service端口"
            name="PortsPort"
            :rules="[{ required: true, message: '请输入Service端口' }]">
          <a-input v-model:value="PortsPort" placeholder="80" />
        </a-form-item>
        <a-form-item
            label="端口协议"
            name="PortsProtocol"
            :rules="[{ required: true, message: '请输入端口协议' }]">
          <a-select style="width:140px;" v-model:value="PortsProtocol" placeholder="请选择">
            <a-select-option value="TCP">TCP</a-select-option>
            <a-select-option value="UDP">UDP</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
            label="容器端口"
            name="TargetPort"
            :rules="[{ required: true, message: '请输入容器端口' }]">
          <a-input v-model:value="TargetPort" placeholder="80" />
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
import { createVNode, reactive, ref, toRefs } from 'vue';
import CHeader from "@/components/CHeader";
import httpClient from '@/request';
import common from "@/config";
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
        title: '类型',
        dataIndex: 'type',
      },
      {
        title: 'CLUSTER-IP',
        dataIndex: 'cluster-ip'
      },
      {
        title: 'EXTERNAL-IP',
        dataIndex: 'external-ip'
      },
      {
        title: '端口',
        dataIndex: 'port'
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
    const namespaceValue = ref('')
    const namespaceList = ref([])
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
    const formRef = ref()
    const createDrawer = ref(false)
    const serviceList = ref([])
    const serviceListData = reactive({
      url : common.k8sServiceList,
      params: {
        filter_name: '',
        namespace: '',
        cluster: '',
        page: 1,
        limit: 10
      }
    })
    const serviceDetail =  reactive({
      metadata: {}
    })
    const serviceDetailData =  reactive({
      url: common.k8sServiceDetail,
      params: {
        service_name: '',
        namespace: '',
        cluster: ''
      }
    })
    const serviceUpdateData = reactive({
      url: common.k8sServiceUpdate,
      params: {
        namespace: '',
        content: '',
        cluster: ''
      }
    })
    const serviceDeleteData = reactive({
      url: common.k8sServiceDelete,
      params: {
        service_name: '',
        namespace: '',
        cluster: ''
      }
    })
    const serviceCreate = reactive({
      Name: '',
      Namespace: '',
      Type: 'ClusterIP',
      Labels: '',
      Selector: '',
      PortsName: '',
      PortsPort: '',
      PortsProtocol: 'TCP',
      TargetPort: '',
    })
    const serviceCreateData = reactive({
      url: common.k8sServiceCreate,
      params: {
        name: '',
        namespace: '',
        type: '',
        label: '',
        selector: '',
        ports_name: '',
        ports_port: '',
        ports_protocol: '',
        target_port: '',
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
      getServiceList()
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
    function getServiceList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      serviceListData.params.filter_name = searchValue.value
      serviceListData.params.namespace = namespaceValue.value
      serviceListData.params.page = pagination.currentPage
      serviceListData.params.limit = pagination.pagesize
      serviceListData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(serviceListData.url,{params: serviceListData.params}).then(res => {
        serviceList.value = res.data.items
        pagination.total = res.data.total
      }).catch(err => {
        message.error("获取Service列表失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function getServiceDetail(e) {
      appLoading.value = true
      serviceDetailData.params.service_name = e.metadata.name
      serviceDetailData.params.namespace = e.metadata.namespace
      serviceDetailData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(serviceDetailData.url,{params: serviceDetailData.params}).then(res => {
        contentYaml.value = transYaml(res.data)
        yamlModal.value = true
      }).catch(err => {
        message.error("获取Service详情失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function updateService() {
      appLoading.value = true
      let content = JSON.stringify(transObj(contentYaml.value))
      serviceUpdateData.params.namespace = namespaceValue.value
      serviceUpdateData.params.content = content
      serviceUpdateData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.put(serviceUpdateData.url,serviceUpdateData.params).then(res => {
        message.success("更新Service成功")
      }).catch(err => {
        message.error("更新Service失败")
      }).finally(() => {
        getServiceList()
        yamlModal.value = false
      })
    }
    function deleteService(e) {
      appLoading.value = true
      serviceDeleteData.params.service_name = e.metadata.name
      serviceDeleteData.params.namespace = e.metadata.namespace
      serviceDeleteData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.delete(serviceDeleteData.url,{data: serviceDeleteData.params}).then(res => {
        message.success("删除Service成功")
      }).catch(err => {
        message.error("删除Service失败")
      }).finally(() => {
        getServiceList()
      })
    }
    function createService() {
      let reg = new RegExp("(^[A-Za-z]+=[A-Za-z0-9]+).*")
      if (!reg.test(serviceCreate.Labels)) {
        message.warning("标签填写异常，请确认后重新填写")
      }
      if (!reg.test(serviceCreate.Selector)) {
        message.warning("选择器填写异常，请确认后重新填写")
      }

      appLoading.value = true

      let label = new Map()
      let selector = new Map()
      let a = (serviceCreate.Labels).split(",")
      let b = (serviceCreate.Selector).split(",")
      a.forEach(item => {
        let b = item.split("=")
        label[b[0]] = b[1]
      })
      b.forEach(item => {
        let b = item.split("=")
        selector[b[0]] = b[1]
      })
      serviceCreateData.params.name = serviceCreate.Name
      serviceCreateData.params.namespace = serviceCreate.Namespace
      serviceCreateData.params.label = label
      serviceCreateData.params.selector = selector
      serviceCreateData.params.type = serviceCreate.Type
      serviceCreateData.params.ports_name = serviceCreate.PortsName
      serviceCreateData.params.ports_port = parseInt(serviceCreate.PortsPort)
      serviceCreateData.params.ports_protocol = serviceCreate.PortsProtocol
      serviceCreateData.params.target_port = parseInt(serviceCreate.TargetPort)
      serviceCreateData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.post(serviceCreateData.url,serviceCreateData.params).then(res => {
        message.success("创建Service成功")
      }).catch(err => {
        message.error("创建Service失败")
      }).finally(() => {
        resetForm()
        getServiceList()
        createDrawer.value = false
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
    function handleAdd() {
      createDrawer.value = true
    }
    async function formSubmit() {
      try {
        await formRef.value.validateFields();
        //console.log('Success:', values);
        createService()
      } catch (errorInfo) {
        console.log('Failed:', errorInfo);
      }
    }
    function resetForm() {
      formRef.value.resetFields();
    }
    function onClose () {
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
      namespaceList,
      pagination,
      columns,
      contentYaml,
      yamlModal,
      cmOptions,
      createDrawer,
      formRef,
      ...toRefs(serviceCreate),
      serviceList,
      serviceCreate,
      serviceDetail,
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      getNamespaceValue,
      getNamespaceList,
      getServiceList,
      getServiceDetail,
      updateService,
      deleteService,
      createService,
      onChange,
      onClose,
      handleAdd,
      formSubmit,
      resetForm,
      showConfirm
    }
  }
};
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