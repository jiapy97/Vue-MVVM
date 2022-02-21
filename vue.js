class Vue {
  constructor(options) {
    this.$data = options.data;

    // 调用数据劫持的方法
    Observe(this.$data);

    // 将属性绑定到this身上
    Object.keys(this.$data).forEach(key => {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get() {
          return this.$data[key];
        },
        set(newValue) {
          this.$data[key] = newValue;
        }
      })
    });


    // 调用模板编译的函数
    Compile(options.el, this);
  }
}
// 定义一个数据劫持的方法
function Observe(obj) {

  // 递归结束条件
  if (!obj || typeof obj !== 'object') {
    return;
  }
  const dep = new Dep();
  Object.keys(obj).forEach((key) => {
    let value = obj[key];
    Observe(value);
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        console.log(`有人获取${key}的值`);
        Dep.target && dep.addSub(Dep.target)
        return value;
      },
      set(newVal) {
        value = newVal
        Observe(value)
        // 通知每个订阅者更新自己的文本
        dep.notify()
      }
    })
  })
};

// 模板编译的方法
function Compile(el, vm) {
  // 获取el对应的DOM元素
  vm.$el = document.querySelector(el);
  // 创建文档碎片，提高DOM操作性能
  const fragment = document.createDocumentFragment();

  // 将el的所有DOM元素添加到文档碎片中
  while (childNode = vm.$el.firstChild) {
    fragment.appendChild(childNode);
  }

  // 进行模板编译
  replace(fragment);

  function replace(node) {
    // 匹配插值表达式的正则
    const regMustache = /\{\{\s*(\S+)\s*\}\}/
    // 证明当前的node节点是一个文本子节点
    if (node.nodeType === 3) {
      const text = node.textContent;
      // 进行正则提取
      const execResult = regMustache.exec(text);

      if (execResult) {
        const value = execResult[1].split('.').reduce((newObj,k) => newObj[k],vm)
        node.textContent = text.replace(regMustache,value)
        // 在这里创建watcher
        new Watcher(vm,execResult[1],(newValue) => {
          node.textContent = text.replace(regMustache,newValue);
        })
      }
      return
    };

    // 判断当前的节点是否为input框
    if (node.nodeType === 1 && node.tagName.toUpperCase() === 'INPUT') {
      // 得到当前元素的所有属性节点
      const attrs = Array.from(node.attributes);
      const findResult = attrs.find(x => x.name === 'v-model')
      if (findResult) {
        // 获取当前v-model属性的值 v-model="name" v-model="info.a"
        const expStr = findResult.value;
        const value = expStr.split('.').reduce((newObj,k) => newObj[k],vm);
        node.value = value;
        // 创建Watcher的实例
        new Watcher(vm,expStr,(newValue) => {
          node.value = newValue;
        })

        // 监听文本框的input输入事件，拿到文本框的最新值，并把最新值更新到vm上即可
        node.addEventListener('input',e => {
          const keyArr = expStr.split('.');
          const obj = keyArr.slice(0,keyArr.length-1).reduce((newObj,k) => newObj[k],vm);
          obj[keyArr[keyArr.length - 1]] = e.target.value;
        })
      }
    }
    // 不是文本节点，则投入递归
    node.childNodes.forEach(child => replace(child))
  }
  
  vm.$el.appendChild(fragment)
}


// 收集watcher订阅者的类
class Dep {
  constructor() {
    this.subs = [];
  }

  addSub(watcher) {
    this.subs.push(watcher);
  }
  // 负责通知每个watcher的方法
  notify() {
    this.subs.forEach(watcher => watcher.update())
  }
}

// 订阅者的类
class Watcher {
  constructor(vm,key,cb) {
    this.vm = vm;
    this.key = key;
    this.cb = cb;

    Dep.target = this;
    key.split('.').reduce((newObj,k) => newObj[k],vm);
    Dep.target = null;
  }

  update() {
    const value = this.key.split('.').reduce((newObj,k) => newObj[k],this.vm)
    this.cb(value);
  }

}