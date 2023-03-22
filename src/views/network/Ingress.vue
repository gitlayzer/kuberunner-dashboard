<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        :namespace="true"
        @namespaceChange="getNamespaceValue"
        @namespaceList="getNamespaceList"
        @dataList="getIngressList"
        :add="true"
        @addFunc="handleAdd"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size:12px;"
          :loading="appLoading"
          :columns="columns"
          :dataSource="ingressList"
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
          <template v-if="column.dataIndex === 'host'">
            <div v-for="(val, key) in record.spec.rules" :key="key">
              <a-popover>
                <template #content>
                  <span>{{ val.host }}</span>
                </template>
                <a-tag style="margin-bottom:5px;cursor:pointer;" color="green">{{ ellipsis(val.host, 15) }}</a-tag>
              </a-popover>
            </div>
          </template>
          <template v-if="column.dataIndex === 'path'">
            <div v-for="(val, key) in record.spec.rules" :key="key">
              <a-popover>
                <template #content>
                  <span>{{ val.http.paths[0].path }}</span>
                </template>
                <a-tag style="margin-bottom:5px;cursor:pointer;" color="green">{{ ellipsis(val.http.paths[0].path, 15) }}</a-tag>
              </a-popover>
            </div>
          </template>
          <template v-if="column.dataIndex === 'external-ip'">
            <span style="font-weight: bold">{{ record.status.loadBalancer.ingress ? record.status.loadBalancer.ingress[0].ip : '' }} </span>
          </template>
          <template v-if="column.dataIndex === 'tls'">
            <span style="font-weight: bold">{{ record.spec.tls ? 'YES' : 'NO' }} </span>
          </template>
          <template v-if="column.dataIndex === 'creationTimestamp'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <a-button type="primary" @click="getIngressDetail(record)" ghost>
              <FormOutlined />
              <span style="margin-left: 3px">详情</span>
            </a-button>
            <a-button danger style="margin-left: 5px" @click="showConfirm('删除', record, deleteIngress)" ghost>
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
        @ok="updateIngress">
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
        title="创建Ingress"
        :footer-style="{ textAlign: 'right' }"
        @close="onClose">
      <br>
      <a-form ref="formRef" :model="ingressCreate" :labelCol="{style: {width: '30%'}}">
        <a-form-item
            label="名称"
            name="Name"
            :rules="[{ required: true, message: '请输入Ingress名称' }]">
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
          <a-input v-model:value="Labels" placeholder="project=ms,app=gateway" />
        </a-form-item>
        <a-form-item
            label="IngressClass"
            name="Ingress_Class_Name"
            :rules="[{ required: true, message: '请输入IngressClass名称:' }]">
          <a-input v-model:value="Ingress_Class_Name" placeholder="nginx" />
        </a-form-item>
        <a-form-item
            label="域名"
            name="Host"
            :rules="[{ required: true, message: '请输入域名' }]">
          <a-input v-model:value="Host" />
        </a-form-item>
        <a-form-item
            label="Path"
            name="Path"
            :rules="[{ required: true, message: '请输入Path' }]">
          <a-input v-model:value="Path" placeholder="/xxx" />
        </a-form-item>
        <a-form-item
            label="Path类型"
            name="Path_Type"
            :rules="[{ required: true, message: '请选择Path类型' }]">
          <a-select style="width:140px;" v-model:value="Path_Type" placeholder="请选择">
            <a-select-option value="Prefix">Prefix</a-select-option>
            <a-select-option value="Exact">Exact</a-select-option>
            <a-select-option value="ImplementationSpecific">ImplementationSpecific</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
            label="Service名称"
            name="Service_Name"
            :rules="[{ required: true, message: '请输入Service Name' }]">
          <a-input v-model:value="Service_Name" />
        </a-form-item>
        <a-form-item
            label="Service端口"
            name="Service_Port"
            :rules="[{ required: true, message: '请输入service端口' }]">
          <a-input v-model:value="Service_Port" />
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
        title: '域名',
        dataIndex: 'host',
      },
      {
        title: '路由',
        dataIndex: 'path'
      },
      {
        title: 'EXTERNAL-IP',
        dataIndex: 'external-ip'
      },
      {
        title: 'SSL',
        dataIndex: 'tls'
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
    const ingressList = ref([])
    const ingressListData = reactive({
      url : common.k8sIngressList,
      params: {
        filter_name: '',
        namespace: '',
        cluster: '',
        page: 1,
        limit: 10
      }
    })
    const ingressDetail =  reactive({
      metadata: {}
    })
    const ingressDetailData =  reactive({
      url: common.k8sIngressDetail,
      params: {
        ingress_name: '',
        namespace: '',
        cluster: ''
      }
    })
    const ingressUpdateData = reactive({
      url: common.k8sIngressUpdate,
      params: {
        namespace: '',
        content: '',
        cluster: ''
      }
    })
    const ingressDeleteData = reactive({
      url: common.k8sIngressDelete,
      params: {
        ingress_name: '',
        namespace: '',
        cluster: ''
      }
    })
    const ingressCreate = reactive({
      Name: '',
      Namespace: '',
      Labels: '',
      Ingress_Class_Name: '',
      Host: '',
      Path: '',
      Path_Type: '',
      Service_Name: '',
      Service_Port: ''
    })
    const ingressCreateData = reactive({
      url: common.k8sIngressCreate,
      params: {
        name: '',
        namespace: '',
        label: {},
        ingress_class_name: '',
        hosts: {}
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
      getIngressList()
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
    function getIngressList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      ingressListData.params.filter_name = searchValue.value
      ingressListData.params.namespace = namespaceValue.value
      ingressListData.params.page = pagination.currentPage
      ingressListData.params.limit = pagination.pagesize
      ingressListData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(ingressListData.url,{params: ingressListData.params}).then(res => {
        ingressList.value = res.data.items
        pagination.total = res.data.total
      }).catch(err => {
        message.error("获取Ingress列表失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function getIngressDetail(e) {
      appLoading.value = true
      ingressDetailData.params.ingress_name = e.metadata.name
      ingressDetailData.params.namespace = e.metadata.namespace
      ingressDetailData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(ingressDetailData.url,{params: ingressDetailData.params}).then(res => {
        contentYaml.value = transYaml(res.data)
        yamlModal.value = true
      }).catch(err => {
        message.error("获取Ingress详情失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function updateIngress() {
      appLoading.value = true
      //将yaml格式的ingress对象转为json
      let content = JSON.stringify(transObj(contentYaml.value))
      ingressUpdateData.params.namespace = namespaceValue.value
      ingressUpdateData.params.content = content
      ingressUpdateData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.put(ingressUpdateData.url, ingressUpdateData.params).then(res => {
        message.success("更新Ingress成功")
      }).catch(err => {
        message.error("更新Ingress失败")
      }).finally(() => {
        getIngressList()
        yamlModal.value = false
      })
    }
    function deleteIngress(e) {
      appLoading.value = true
      ingressDeleteData.params.ingress_name = e.metadata.name
      ingressDeleteData.params.namespace = e.metadata.namespace
      ingressDeleteData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.delete(ingressDeleteData.url,{data: ingressDeleteData.params}).then(res => {
        message.success("删除Ingress成功")
      }).catch(err => {
        message.error("删除Ingress失败")
      }).finally(() => {
        getIngressList()
      })
    }
    function createIngress() {
      let reg = new RegExp("(^[A-Za-z]+=[A-Za-z0-9]+).*")
      if (!reg.test(ingressCreate.Labels)) {
        message.warning("标签填写异常，请确认后重新填写")
      }
      appLoading.value = true
      let label = {}
      let a = ingressCreate.Labels.split(",")
      a.forEach(item => {
        let b = item.split("=")
        label[b[0]] = b[1]
      })

      let httpPaths = [{
        path: ingressCreate.Path,
        path_type: ingressCreate.Path_Type,
        service_name: ingressCreate.Service_Name,
        service_port: parseInt(ingressCreate.Service_Port)
      }]
      let hosts = [{
        host: ingressCreate.Host,
        http_paths: httpPaths
      }]
      ingressCreateData.params.name = ingressCreate.Name
      ingressCreateData.params.namespace = ingressCreate.Namespace
      ingressCreateData.params.label = label
      ingressCreateData.params.hosts = hosts
      ingressCreateData.params.ingress_class_name = ingressCreate.Ingress_Class_Name
      ingressCreateData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.post(ingressCreateData.url, ingressCreateData.params).then(res => {
        message.success("创建Ingress成功")
      }).catch(err => {
        message.error("创建Ingress失败")
      }).finally(() => {
        resetForm()
        getIngressList()
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
        createIngress()
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
      ingressList,
      ingressDetail,
      contentYaml,
      yamlModal,
      cmOptions,
      createDrawer,
      ingressCreate,
      formRef,
      ...toRefs(ingressCreate),
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      getNamespaceValue,
      getNamespaceList,
      getIngressList,
      getIngressDetail,
      onChange,
      updateIngress,
      showConfirm,
      deleteIngress,
      handleAdd,
      onClose,
      formSubmit,
    }
  }
};
</script>

<style scoped>

</style>