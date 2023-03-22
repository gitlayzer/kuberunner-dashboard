<template>
  <div>
    <c-header
        searchDescribe="请输入"
        @searchChange="getSearchValue"
        :namespace="true"
        @namespaceChange="getNamespaceValue"
        @namespaceList="getNamespaceList"
        @dataList="getStatefulSetList"
        :add="true"
        @addFunc="handleAdd"/>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-table
          style="font-size: 12px"
          :loading="appLoading"
          :columns="columns"
          :dataSource="statefulSetList"
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
          <template v-if="column.dataIndex === 'containers'">
            <span style="font-weight:bold;">{{ record.status.availableReplicas > 0 ? record.status.availableReplicas: 0 }} / {{ record.spec.replicas > 0 ? record.spec.replicas: 0 }}</span>
          </template>
          <template v-if="column.dataIndex === 'createTime'">
            <a-tag color="gray">{{ timeTrans(record.metadata.creationTimestamp) }}</a-tag>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <a-button type="primary" @click="getStatefulSetDetail(record)" ghost>
              <FormOutlined />
              <span style="margin-left: 3px">详情</span>
            </a-button>
            <a-button danger style="margin-left: 5px" @click="showConfirm('删除', record, deleteStatefulSet)" ghost>
              <DeleteOutlined />
              <span style="margin-left: 3px">删除</span>
            </a-button>
            <a-button class="terminal-btn" style="margin-top: 5px" type="primary" @click="handleReplicasModal(record) " ghost>
              <CopyOutlined />
              <span style="margin-left: 3px">扩容</span>
            </a-button>
            <a-button class="log-btn" style="margin-left: 5px; margin-top: 5px" type="primary" @click="showConfirm('重启', record, restartStatefulSet)" ghost>
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
        @ok="updateStatefulSet">
      <codemirror
          :value="contentYaml"
          border
          :options="cmOptions"
          height="500"
          style="font-size:14px;"
          @change="onChange"
      ></codemirror>
    </a-modal>
    <a-modal
        v-model:visible="statefulSetReplicasModal"
        title="副本数调整"
        :confirm-loading="appLoading"
        cancelText="取消"
        okText="更新"
        @ok="updateStatefulSetReplicas">
      <div style="text-align:center">
        <span style="margin-right:30px;">实例数: </span>
        <a-input-number v-model:value="statefulSetReplicasNum" :min="0" :max="30" label="描述文字"></a-input-number>
        <a-popover>
          <template #content>
            <span>Deployment实例数最小0，最大30</span>
          </template>
          <info-circle-outlined style="margin-left:10px;color:rgb(84, 138, 238);" />
        </a-popover>
      </div>
    </a-modal>
    <a-drawer
        v-model:visible="createDrawer"
        title="创建Deployment"
        :footer-style="{ textAlign: 'right' }"
        @close="onClose">
      <br>
      <a-form ref="formRef" :model="statefulSetCreate" :labelCol="{style: {width: '30%'}}">
        <a-form-item
            label="名称"
            name="Name"
            :rules="[{ required: true, message: '请输入Deployment名称' }]">
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
            label="副本数"
            name="Replicas">
          <a-input-number v-model:value="Replicas" :min="1" :max="30"></a-input-number>
          <a-popover>
            <template #content>
              <span>Deployment副本数最小1，最大30</span>
            </template>
            <info-circle-outlined style="margin-left:10px;color:rgb(84, 138, 238);" />
          </a-popover>
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
import CHeader from '@/components/CHeader';
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
        title: '容器组',
        dataIndex: 'containers',
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
    const statefulSetList = ref([]);
    const statefulSetListData = reactive({
      url: common.k8sStatefulSetList,
      params: {
        filter_name: '',
        namespace: '',
        cluster: '',
        page: 1,
        limit: 10,
      }
    })
    const statefulSetDetail =  reactive({
      metadata: {}
    })
    const statefulSetDetailData = reactive({
      url: common.k8sStatefulSetDetail,
      params: {
        statefulset_name: '',
        namespace: '',
        cluster: '',
      }
    })
    const statefulSetUpdate = reactive({
      url: common.k8sStatefulSetUpdate,
      params: {
        namespace: '',
        cluster: '',
        content: '',
      }
    })
    const statefulSetReplicasNum = ref(0)
    const statefulSetReplicasModal = ref(false)
    const statefulSetUpdateReplicas = reactive({
      url: common.k8sStatefulSetReplicas,
      params: {
        namespace: '',
        cluster: '',
        statefulset_name: '',
        replicas: 0,
      }
    })
    const statefulSetRestart = reactive({
      url: common.k8sStatefulSetRestart,
      params: {
        namespace: '',
        cluster: '',
        statefulset_name: '',
      }
    })
    const statefulSetDelete = reactive({
      url: common.k8sStatefulSetDelete,
      params: {
        namespace: '',
        cluster: '',
        statefulset_name: '',
      }
    })
    const statefulSetCreate = reactive({
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
    const statefulSetCreateData = reactive({
      url: common.k8sStatefulSetCreate,
      params: {
        name: '',
        namespace: '',
        replicas: 1,
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
      getStatefulSetList()
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
    function getStatefulSetList() {
      appLoading.value = true
      if (searchValue.value) {
        pagination.currentPage = 1
      }
      statefulSetListData.params.filter_name = searchValue.value
      statefulSetListData.params.namespace = namespaceValue.value
      statefulSetListData.params.page = pagination.currentPage
      statefulSetListData.params.limit = pagination.pageSize
      statefulSetListData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(statefulSetListData.url,{params: statefulSetListData.params}).then(res => {
        statefulSetList.value = res.data.items
        pagination.total = res.data.total
      }).catch(err => {
        console.log("获取statefulSet列表失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function getStatefulSetDetail(e) {
      appLoading.value = true
      statefulSetDetailData.params.statefulset_name = e.metadata.name
      statefulSetDetailData.params.namespace = e.metadata.namespace
      statefulSetDetailData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.get(statefulSetDetailData.url,{params: statefulSetDetailData.params}).then(res => {
        contentYaml.value = transYaml(res.data)
        yamlModel.value = true
      }).catch(err => {
        console.log("获取statefulSet详情失败")
      }).finally(() => {
        appLoading.value = false
      })
    }
    function updateStatefulSet() {
      appLoading.value = true
      let content = JSON.stringify(transObj(contentYaml.value))
      statefulSetUpdate.params.namespace = namespaceValue.value
      statefulSetUpdate.params.content = content
      statefulSetUpdate.params.cluster = localStorage.getItem('k8s_cluster')
      console.log(statefulSetDetail.metadata)
      httpClient.put(statefulSetUpdate.url,statefulSetUpdate.params).then(res => {
        message.success("更新statefulSet成功")
      }).catch(err => {
        message.error("更新statefulSet失败")
      }).finally(() => {
        getStatefulSetList()
        yamlModel.value = false
        appLoading.value = false
      })
    }
    function handleReplicasModal(e) {
      statefulSetReplicasModal.value = true
      statefulSetDetail.metadata = e.metadata
      statefulSetReplicasNum.value = e.spec.replicas
    }
    function updateStatefulSetReplicas() {
      appLoading.value = true
      statefulSetUpdateReplicas.params.statefulset_name = statefulSetDetail.metadata.name
      statefulSetUpdateReplicas.params.namespace = statefulSetDetail.metadata.namespace
      statefulSetUpdateReplicas.params.replicas = statefulSetReplicasNum.value
      statefulSetUpdateReplicas.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.put(statefulSetUpdateReplicas.url,statefulSetUpdateReplicas.params).then(res => {
        message.success("更新statefulSet副本数成功")
      }).catch(err => {
        message.error("更新statefulSet副本数失败")
      }).finally(() => {
        getStatefulSetList()
        statefulSetReplicasModal.value = false
      })
    }
    function restartStatefulSet(e) {
      appLoading.value = true
      statefulSetRestart.params.statefulset_name = e.metadata.name
      statefulSetRestart.params.namespace = e.metadata.namespace
      statefulSetRestart.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.put(statefulSetRestart.url,statefulSetRestart.params).then(res => {
        message.success("重启statefulSet成功")
      }).catch(err => {
        message.error("重启statefulSet失败")
      }).finally(() => {
        getStatefulSetList()
      })
    }
    function deleteStatefulSet(e) {
      appLoading.value = true
      statefulSetDelete.params.statefulset_name = e.metadata.name
      statefulSetDelete.params.namespace = e.metadata.namespace
      statefulSetDelete.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.delete(statefulSetDelete.url,{data: statefulSetDelete.params}).then(res => {
        message.success("删除statefulSet成功")
      }).catch(err => {
        message.error("删除statefulSet失败")
      }).finally(() => {
        getStatefulSetList()
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
        cancelText: "取消",
        okText: "确定",
        onOk() {
          fn(res);
        },
      })
    }
    function handleAdd() {
      createDrawer.value = true
    }
    async function formSubmit() {
      try {
        await formRef.value.validateFields();
        createStatefulSet()
      } catch (errInfo) {
        console.log('Failed:', errInfo);
      }
    }
    function resetForm() {
      formRef.value.resetFields();
    }
    function createStatefulSet() {
      let regex = new RegExp("(^[A-Za-z]+=[A-Za-z0-9]+).*")
      if (!regex.test(statefulSetCreate.Labels)) {
        message.warning("标签填写异常，请确认后重新填写")
      }

      appLoading.value = true

      let label = new Map ()
      let a = (statefulSetCreate.Labels).split(",")
      a.forEach(item => {
        let b = item.split("=")
        label[b[0]] = b[1]
      })
      let cpu, memory
      let resourceList = statefulSetCreate.Resources.split('/')
      cpu = resourceList[0]
      memory = resourceList[1] + "Gi"
      statefulSetCreateData.params.label = label
      statefulSetCreateData.params.cpu = cpu
      statefulSetCreateData.params.memory = memory
      statefulSetCreateData.params.name = statefulSetCreate.Name
      statefulSetCreateData.params.namespace = statefulSetCreate.Namespace
      statefulSetCreateData.params.replicas = statefulSetCreate.Replicas
      statefulSetCreateData.params.image = statefulSetCreate.Image
      statefulSetCreateData.params.health_check = statefulSetCreate.Health_Check
      statefulSetCreateData.params.health_path = statefulSetCreate.Health_Path
      statefulSetCreateData.params.container_port = parseInt(statefulSetCreate.Container_Port)
      statefulSetCreateData.params.cluster = localStorage.getItem('k8s_cluster')
      httpClient.post(statefulSetCreateData.url,statefulSetCreateData.params).then(res => {
        message.success("创建statefulSet成功")
      }).catch(err => {
        message.error("创建statefulSet失败")
      }).finally(() => {
        resetForm()
        getStatefulSetList()
        createDrawer.value = false
      })
      appLoading.value = true
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
      statefulSetList,
      namespaceList,
      statefulSetDetail,
      statefulSetReplicasModal,
      statefulSetReplicasNum,
      createDrawer,
      formRef,
      ...toRefs(statefulSetCreate),
      timeTrans,
      ellipsis,
      handleTableChange,
      getSearchValue,
      getNamespaceValue,
      getNamespaceList,
      getStatefulSetList,
      getStatefulSetDetail,
      updateStatefulSet,
      statefulSetCreate,
      updateStatefulSetReplicas,
      handleReplicasModal,
      restartStatefulSet,
      deleteStatefulSet,
      showConfirm,
      handleAdd,
      onClose,
      onChange,
      formSubmit,
    }
  }
};
</script>

<style scoped>
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