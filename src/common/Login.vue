<template>
  <div class="login">
    <a-card class="login-card" headStyle="{padding: '0px'}" :bodyStyle="{padding: '20px'}">
      <template #title>
        <div class="login-card-header">
          <img style="height: 25px;margin:0 8px 5px 0" :src="kubeLogo" alt="">
          <span>KubeRunner</span>
        </div>
      </template>
      <a-form ref="formRef" :model="loginData" :Label-col="{span: 5}">
        <a-form-item style="text-align: center" label="账号" name="username" :rules="[{required: true, message: '请输入账号'}]">
          <a-input v-model:value="loginData.username"></a-input>
        </a-form-item>
        <a-form-item style="text-align: center" label="密码" name="password" :rules="[{required: true, message: '请输入密码'}]">
          <a-input-password v-model:value="loginData.password"></a-input-password>
        </a-form-item>
        <a-form-item style="text-align: center;margin-bottom: 10px">
          <a-button style="width:100%" type="primary" @click="onCheck" ghost>
              <telemplate>
                <LoginOutlined />
              </telemplate>
            <span style="margin-left: 5px">登录</span>
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script>
  import kubeLogo from '@/assets/k8s-logo.png'
  import {reactive, ref} from "vue";
  import common from "@/config";
  import httpClient from "@/request";
  import moment from "moment";
  import { message } from "ant-design-vue";
  export default {
    setup() {
      const formRef = ref()
      const loginData = reactive ({
        username: '',
        password: ''
      })
      const longinUrl = common.loginAuth
      const onCheck = async () => {
        try {
          await formRef.value.validateFields()
          handleLogin()
        } catch(errorInfo) {
          console.log(errorInfo)
        }
      }

      function handleLogin() {
        httpClient.post(longinUrl, loginData).then(res => {
          localStorage.setItem('username', loginData.username)
          localStorage.setItem('password', loginData.password)
          localStorage.setItem('loginDate', moment().format("YYYY-MM-DD HH:mm:ss"))
          window.location.href = '/'
          message.success('登录成功')
        }).catch(res => {
          message.error('登录失败')
        })
      }

      return {
        kubeLogo,
        formRef,
        loginData,
        onCheck,
      }
    }
  }
</script>

<style scoped>
  .login {
    height: 100vh;
    background-image: url(@/assets/bj.jpg);
    background-size: cover;
    display: grid;
    place-items: center;
  }
  .login-card {
    /*背景偏黑并透明*/
    background: rgba(0, 0, 0, 0.5);
    width: 350px;
  }
  .login-card-header {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
  }
</style>