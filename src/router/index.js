import { createRouter, createWebHistory } from "vue-router";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import Layout from "@/layout/Layout";

const routes = [
  {
    path: "/",
    name: "跳转中......",
    redirect: "/home",
  },
  {
    path: "/login",
    component: () => import("@/common/Login.vue"),
    meta: {
      title: "登录",
    }
  },
  {
    path: "/home",
    component: Layout,
    name: "首页",
    children: [
      {
        path: "/home",
        name: "概览",
        icon: "fund-outlined",
        meta: {
          title: "概览",
        },
        component: () => import("@/views/home/Home.vue"),
      }
    ]
  },
  {
    path: "/cluster",
    name: "集群管理",
    component: Layout,
    icon: "cluster-outlined",
    children: [
      {
        path: "/cluster/node",
        name: "Node管理",
        meta: {
          title: "Node管理",
        },
        component: () => import("@/views/cluster/Node.vue"),
      },
      {
        path: "/cluster/namespace",
        name: "Namespace管理",
        meta: {
          title: "Namespace管理",
        },
        component: () => import("@/views/cluster/Namespace.vue"),
      },
    ]
  },
  {
    path: "/workload",
    name: "工作负载",
    component: Layout,
    icon: "block-outlined",
    children: [
      {
        path: "/workload/pod",
        name: "Pod管理",
        meta: {
          title: "Pod管理",
        },
        component: () => import("@/views/workload/Pod.vue"),
      },
      {
        path: "/workload/deployment",
        name: "Deployment管理",
        meta: {
          title: "Deployment管理",
        },
        component: () => import("@/views/workload/Deployment.vue"),
      },
      {
        path: "/workload/statefulset",
        name: "StatefulSet管理",
        meta: {
          title: "StatefulSet管理",
        },
        component: () => import("@/views/workload/StatefulSet.vue"),
      },
      {
        path: "/workload/daemonset",
        name: "DaemonSet管理",
        meta: {
          title: "DaemonSet管理",
        },
        component: () => import("@/views/workload/DaemonSet.vue"),
      },
    ]
  },
  {
    name: "终端",
    path: "/workload/pod/terminal",
    component: () => import("@/views/workload/Terminal.vue"),
    meta: {
      title: "终端",
      requireAuth: false,
    },
  },
  {
    name: "日志",
    path: "/workload/pod/log",
    component: () => import("@/views/workload/Log.vue"),
    meta: {
      title: "日志",
      requireAuth: false,
    }
  },
  {
    path: "/network",
    name: "网络管理",
    component: Layout,
    icon: "deployment-unit-outlined",
    children: [
      {
        path: "/network/service",
        name: "Service管理",
        meta: {
          title: "Service管理",
        },
        component: () => import("@/views/network/Service.vue"),
      },
      {
        path: "/network/ingress",
        name: "Ingress管理",
        meta: {
          title: "Ingress管理",
        },
        component: () => import("@/views/network/Ingress.vue"),
      }
    ]
  },
  {
    path: "/storage",
    name: "存储管理",
    component: Layout,
    icon: "database-outlined",
    children: [
      {
        path: "/storage/persistentvolume",
        name: "PersistentVolume管理",
        meta: {
          title: "PersistentVolume管理",
        },
        component: () => import("@/views/storage/PersistentVolume.vue"),
      },
      {
        path: "/storage/persistentvolumeclaim",
        name: "PersistentVolumeClaim管理",
        meta: {
          title: "PersistentVolumeClaim管理",
        },
        component: () => import("@/views/storage/PersistentVolumeClaim.vue"),
      },
      {
        path: "/storage/storageclass",
        name: "StorageClass管理",
        meta: {
          title: "StorageClass管理",
        },
        component: () => import("@/views/storage/StorageClass.vue"),
      }
    ]
  },
  {
    path: "/config",
    name: "配置管理",
    component: Layout,
    icon: "setting-outlined",
    children: [
      {
        path: "/config/configmap",
        name: "ConfigMap管理",
        meta: {
          title: "ConfigMap管理",
        },
        component: () => import("@/views/config/ConfigMap.vue"),
      },
      {
        path: "/config/secret",
        name: "Secret管理",
        meta: {
          title: "Secret管理",
        },
        component: () => import("@/views/config/Secret.vue"),
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

NProgress.inc(100);
NProgress.configure({ easing: "ease", speed: 500, showSpinner: false });
router.beforeEach((to, from, next) => {
  NProgress.start();
  if (to.meta.title) {
    document.title = to.meta.title;
  } else {
    document.title = "Kube_manager";
  }
  next();
});

router.beforeEach((to, from, next) => {
  let token = localStorage.getItem("password");
  if (token == null && to.path !== "/login") {
    next("/login");
  } else {
    next();
  }
});

router.afterEach(() => {
  NProgress.done();
});

export default router;