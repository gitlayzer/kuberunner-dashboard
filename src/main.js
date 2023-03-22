import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/antd.dark.css";
import * as Icons from "@ant-design/icons-vue";
import { GlobalCmComponent } from "codemirror-editor-vue3";
import 'codemirror/theme/dracula.css'
import 'codemirror/mode/yaml/yaml.js'

const app = createApp(App)
for (const i in Icons) {
  app.component(i, Icons[i]);
}

app.use(GlobalCmComponent, { componentName: "codemirror"})
app.use(Antd);
app.use(router);
app.mount("#app");