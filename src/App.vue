<template>
  <router-view></router-view>
</template>

<style>
  /*设置页面大小*/
  html, body {
    width: 100vw;
    height: 100vh;
    min-width: 1425px;
    overflow-y: hidden;
  }
  /*设置进度条颜色*/
  #nprogress .bar {
    background: #2186c0 !important;
  }
</style>