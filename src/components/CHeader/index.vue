<template>
  <div>
    <a-card :bodyStyle="{padding: '10px'}">
      <a-row>
        <a-col :span="20">
          <div style="text-align: left">
            <span v-if="namespace" style="font-size: 14px">命名空间</span>
            <a-select
                v-if="namespace"
                allow-clear
                show-search
                style="width: 140px;margin-right: 20px;margin-left: 15px;text-align: left"
                size="small"
                v-model:value="namespaceValue"
                placeholder="请选择"
                @change="nsChange">
              <a-select-option v-for="(item, index) in namespaceList" :key="index" :value="item.metadata.name">
                {{item.metadata.name}}
              </a-select-option>
            </a-select>
            <a-input
                allow-clear
                style="width: 200px;margin-right: 10px"
                v-model:value="searchValue"
                size="small"
                :placeholder="searchDescribe"
                @change="searchChange">
            </a-input>
            <a-button type="primary" size="small" @click="$emit('dataList')" ghost>
              <SearchOutlined />
              搜索
            </a-button>
          </div>
        </a-col>
        <a-col :span="4">
          <div style="text-align: right">
            <a-button v-if="add" style="margin-right: 10px" type="primary" size="small" @click="$emit('addFunc')" ghost>
              <PlusOutlined />
              <span style="margin-left: 5px">新增</span>
            </a-button>
            <a-button size="small" @click="$emit('dataList')" >
              <UndoOutlined />
              <span style="margin-left: 5px">刷新</span>
            </a-button>
          </div>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script>
import {onMounted, reactive, ref} from "vue";
import common from "@/config";
import { message } from "ant-design-vue";
import httpClient from "@/request";
export default {
  name: "CHeader",
  props: {
    namespace: {type: Boolean, default: false},
    searchDescribe: {type: String, default: ""},
    add: {type: Boolean, default: false},
  },

  emits: ["addFunc", "searchChange", "namespaceChange", "namespaceList", "dataList"],

  setup(props, ctx){
    const searchValue = ref('');
    const namespaceValue = ref("");
    const namespaceList = ref([]);
    const namespaceListData = reactive({
      url: common.k8sNamespaceList,
      params: {
        cluster: '',
      },
    })

    function searchChange(val) {
      ctx.emit("searchChange", searchValue.value);
    }

    function nsChange(val) {
      namespaceValue.value = val;
      localStorage.setItem("namespace", val);
      ctx.emit("namespaceChange", val);
      ctx.emit("dataList");
    }

    function getNamespaceList() {
      namespaceListData.params.cluster = localStorage.getItem("k8s_cluster");
      httpClient.get(namespaceListData.url, {params: namespaceListData.params}).then(res => {
        namespaceList.value = res.data.items;
        ctx.emit("namespaceList", namespaceList.value);
      }).catch(err => {
        message.error("获取命名空间失败");
      })
    }

    onMounted(() => {
      if (localStorage.getItem("namespace")) {
        nsChange("");
      } else {
        nsChange(namespaceValue.value);
      }
      getNamespaceList()
    })

    return {
      namespaceValue,
      namespaceList,
      nsChange,
      searchValue,
      searchChange,
    }
  }
}
</script>

<style scoped>
  .ant-btn {
    border-radius: 0px;
  }
</style>