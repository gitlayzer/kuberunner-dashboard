<template>
  <a-layout>
    <a-affix>
      <a-layout-header>
        <div style="float: left">
          <a href="https://github.com/gitlayzer" target="_blank" onclick="window.open('https://github.com/gitlayzer'); return false;">
            <img :src="k8sLogo" style="height: 40px; margin-bottom: 10px" />
          </a>
          <span style="font-size: 25px;padding: 0 50px 0 20px; font-weight: bold; color:#fff">
            <a href="/" style="color: #fff">KubeRunner</a>
          </span>
        </div>
        <a-menu
          :selectedKeys="selectedKeysOne"
          mode="horizontal"
          theme="dark"
          style="float: left; line-height: 64px;">
          <a-menu-item style="color: #fff" v-for="items in clusterList" :key="items" @click="clusterChange(items)">
            {{ items }}
          </a-menu-item>
        </a-menu>
        <div style="float: right">
          <a href="https://github.com/gitlayzer" target="_blank" onclick="window.open('https://github.com/gitlayzer'); return false;">
            <img style="height: 40px; border-radius: 50px; margin-right: 10px;" :src="k8sLogo"/>
          </a>
          <a-dropdown :overlayStyle="{paddingTop: '20px'}">
            <a>
              Gitlayzer
              <down-outlined />
            </a>
            <template #overlay>
              <a-menu>
                <a-menu-item>
                  <a @click="logout()">退出登录</a>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>
    </a-affix>
    <a-layout style="height: calc(100vh - 68px)">
      <a-layout-sider width="240" v-model:collapsed="collapsed" collapsible>
        <a-menu
          :selectedKeys="selectedKeystwo"
          :openKeys="openKeys"
          @openChange="onOpenChange"
          mode="inline"
          :style="{height: '100%', borderRight: 0}">
          <template v-for="menu in routers" :key="menu">
            <a-menu-item
              v-if="menu.children && menu.children.length == 1"
              :index="menu.children[0].path"
              :key="menu.children[0].path"
              @click="routeChange('item', menu.children[0].path)">
              <template #icon>
                <component :is="menu.children[0].icon" />
              </template>
              <span>{{ menu.children[0].name }}</span>
            </a-menu-item>
            <a-sub-menu
              v-else-if="menu.children && menu.children.length > 1"
              :index="menu.path"
              :key="menu.path">
              <template #icon>
                <component :is="menu.icon" />
              </template>
              <template #title>
                <span>
                  <span :class="[collapsed ? 'is-collapse' : '']">{{ menu.name }}</span>
                </span>
              </template>
              <a-menu-item
                v-for="child in menu.children"
                :key="child.path"
                :index="child.path"
                @click="routeChange('sub', child.path)">
                <span>{{ child.name }}</span>
              </a-menu-item>
            </a-sub-menu>
          </template>
        </a-menu>
      </a-layout-sider>
      <a-layout style="padding: 0 24px" >
        <a-breadcrumb style="margin: 10px" separator=">">
          <a-breadcrumb-item>工作台</a-breadcrumb-item>
          <template v-for="(matched,index) in router.currentRoute.value.matched" :key="index">
            <a-breadcrumb-item>{{ matched.name }}</a-breadcrumb-item>
          </template>
        </a-breadcrumb>
        <a-layout-content :style="{ background: 'rgb(31, 30, 30)', padding: '24px', margin: 0, minHeight: '280px', overflowY: 'auto' }">
          <router-view />
        </a-layout-content>
        <a-layout-footer style="text-align: center">
          Copyright © 2023 Powered by <a href="https://kudevops.cn" target="_blank">Layzer</a> on Kubernetes Dashboard
        </a-layout-footer>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<script>
import {ref, onMounted, reactive, onBeforeMount} from 'vue'
import k8sLogo from '@/assets/k8s-logo.png'
import common from '@/config'
import httpClient from '@/request'
import { message } from 'ant-design-vue'
import { useRouter } from "vue-router";

export default {
  setup() {
    const collapsed = ref(false)
    const selectedKeysOne = ref([])
    const clusterList = ref([])
    const clusterListData = reactive({
      url: common.k8sClusterList,
    })
    const routers = ref([])
    const selectedKeystwo = ref([])
    const openKeys = ref([])
    const router = useRouter()

    function getClusterList() {
      httpClient(clusterListData.url).then(res => {
        clusterList.value = res.data
        selectedKeysOne.value = [localStorage.getItem('k8s_cluster')]
        localStorage.setItem('clusterNum', res.data.length)
      }).catch(err => {
        message.error(err)
      })
    }

    function clusterChange(val) {
      if (selectedKeysOne.value[0] == val) {
        return
      } else {
        selectedKeysOne.value[0] == val
        localStorage.setItem('k8s_cluster', val)
        location.replace(router.currentRoute.value.path)
      }
    }

    function logout() {
      localStorage.removeItem('loginDate')
      localStorage.removeItem('username')
      localStorage.removeItem('password')
      localStorage.removeItem('clusterNum')
      localStorage.removeItem('k8s_cluster')
      localStorage.removeItem("namespace")

      router.push('/login')
    }

    function routeChange(type, path) {
      if (type != 'sub') {
        openKeys.value = []
      }

      selectedKeystwo.value = [path]

      if (router.currentRoute.value.path != path) {
        router.push(path)
      }
    }

    function onOpenChange(val) {
      const latestOpenKey = val.find(key => openKeys.value.indexOf(key) === -1)  // 找到最新展开的key
      openKeys.value = latestOpenKey ? [latestOpenKey] : []  // 保证只有一个展开
    }

    function getRouter(val) {
      selectedKeystwo.value = [val[1].path]
      openKeys.value = [val[0].path]
    }

    onMounted(() => {
      routers.value = router.options.routes
      getRouter(router.currentRoute.value.matched)
      getClusterList()
    })

    return {
      collapsed,
      k8sLogo,
      selectedKeysOne,
      clusterList,
      logout,
      routers,
      selectedKeystwo,
      openKeys,
      router,
      routeChange,
      onOpenChange,
      clusterChange
    }
  }
}
</script>

<style scoped>
  .ant-layout-header {
    padding: 0 30px !important;
  }
  .ant-layout-footer {
    padding: 5px 50px !important;
    color: rgb(239, 239, 239);
  }
  .is-collapse {
    display: none;
  }
  .ant-layout-content::-webkit-scrollbar {
    width: 6px;
  }
  .ant-layout-content::-webkit-scrollbar-thumb {
    background-color: rgb(164, 162, 162);
  }
  .ant-layout-content::-webkit-scrollbar-thumb {
    background-color: #666;
  }
  .ant-layout-sider {
    background: #141414 !important;
    overflow-y: auto;
  }
  .ant-layout-sider::-webkit-scrollbar {
    display: none;
  }
  .ant-menu-item {
    margin: 0 !important;
  }
</style>