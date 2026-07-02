# 51migpt

`51migpt` 基于 migpt-next 开源项目二次开发，支持**自定义消息回复**和**中断小爱语音输出**功能，让家里的小爱音箱变身智能问答能手，打造孩子的高级玩具，解锁更多可能！

## 功能特性

- 自定义大模型接入：支持兼容 OpenAI 接口的任意大模型服务
- 中断小爱语音：检测到唤醒词时自动中断小爱当前回复，实现流畅对话
- 自定义消息处理：支持自定义 onMessage 函数处理特定场景
- 对话历史管理：支持携带历史消息进行上下文对话
- Docker 一键部署：提供完整的 Docker 构建方案

## Docker 运行

首先，克隆仓库代码到本地。

```shell
# 克隆代码
git clone https://github.com/pirloyang/51migpt.git

# 进入配置文件所在目录
cd 51migpt/apps/example
```

然后把 `config.js` 文件里的配置修改成你自己的。

```js
export default {
  speaker: {
    userId: "123456",
    password: "xxxxxxxx",
    did: "Xiaomi 智能音箱 Pro",
  },
  openai: {
    model: "gpt-4.1-mini",
    baseURL: "https://api.openai.com/v1",
    apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  prompt: {
    system: "你是一个智能助手，请根据用户的问题给出回答。",
  },
  async onMessage(engine, { text }) {
    if (text === "测试") {
      return { text: "你好，很高兴认识你！" };
    }
  },
};
```

修改好 `config.js` 配置文件之后，构建并运行 Docker。

```shell
# 从项目根目录构建镜像
cd ..
docker build -t 51migpt:latest -f apps/example/Dockerfile .

# 运行容器
docker run -it --rm -v $(pwd)/config.js:/app/config.js 51migpt:latest
```

## Node.js 运行

首先，在你的项目里安装 `@51migpt/next` 依赖

```shell
pnpm install @51migpt/next
```

```typescript
import { MiGPT } from "@51migpt/next";

async function main() {
  await MiGPT.start({
    speaker: {
      userId: "123456",
      password: "xxxxxxxx",
      did: "Xiaomi 智能音箱 Pro",
    },
    openai: {
      model: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
    prompt: {
      system: "你是一个智能助手，请根据用户的问题给出回答。",
    },
    async onMessage(engine, { text }) {
      if (text === "测试") {
        return { text: "你好，很高兴认识你！" };
      }
    },
  });
  process.exit(0);
}

main();
```

## 核心功能详解

### 中断小爱语音输出

当检测到唤醒词（默认 `['请', '你']`）时，会自动中断小爱当前的语音输出，立即播放大模型的回复，实现流畅的对话体验。

### 自定义消息处理

通过 `onMessage` 函数可以实现自定义消息处理逻辑：

```js
async onMessage(engine, { text }) {
  if (text === "讲个笑话") {
    // 打断小爱回复
    await engine.speaker.abortXiaoAI();
    // 调用 AI 回答
    const { text } = await engine.askAI({ text });
    // 播放回答
    await engine.speaker.play({ text });
    return { handled: true };
  }
}
```

## 配置参数

| 参数                       | 类型     | 说明                       |
| -------------------------- | -------- | -------------------------- |
| `speaker.userId`           | string   | 小米 ID（一串数字）        |
| `speaker.password`         | string   | 小米账号密码               |
| `speaker.did`              | string   | 小爱音箱在米家中的名称     |
| `speaker.passToken`        | string   | （可选）小米账号 passToken |
| `openai.baseURL`           | string   | 大模型服务接口地址         |
| `openai.apiKey`            | string   | API 密钥                   |
| `openai.model`             | string   | 模型名称                   |
| `prompt.system`            | string   | 系统提示词                 |
| `context.historyMaxLength` | number   | 历史消息最大数量           |
| `callAIKeywords`           | string[] | 触发 AI 回复的关键词列表   |
| `debug`                    | boolean  | 是否开启调试模式           |

## 常见问题

### Q：一直提示登录失败，无法正常运行？

一般是因为登录小米账号时触发了安全验证，可以参考此处解决：https://github.com/idootop/migpt-next/issues/4

### Q：控制台能看到 AI 的回答文字，但是播放的还是小爱自己的回答？

你可以修改 `config.js` 文件里的 `onMessage` 函数来修复此问题：

```js
async onMessage(engine, msg) {
  if (engine.config.callAIKeywords.some((e) => msg.text.startsWith(e))) {
    // 打断原来小爱的回复
    await engine.speaker.abortXiaoAI();
    // 调用 AI 回答
    const { text } = await engine.askAI(msg);
    console.log(`🔊 ${text}`);
    // TTS 播放文字
    await engine.MiOT.doAction(5, 1, text); // 注意把 5,1 换成你的设备 ttsCommand
    return { handled: true };
  }
}
```

### Q：如何获取设备的 ttsCommand？

可以在米家 APP 中查看设备详情，或开启 debug 模式查看设备支持的指令列表。

## 免责声明

1. **适用范围**
   本项目为开源非营利项目，仅供学术研究或个人测试用途。严禁用于商业服务、网络攻击、数据窃取、系统破坏等违反《网络安全法》及使用者所在地司法管辖区的法律规定的场景。
2. **非官方声明**
   本项目由第三方开发者独立开发，与小米集团及其关联方（下称"权利方"）无任何隶属/合作关系，亦未获其官方授权/认可或技术支持。项目中涉及的商标、固件、云服务的所有权利归属小米集团。若权利方主张权益，使用者应立即主动停止使用并删除本项目。

继续下载或运行本项目，即表示您已完整阅读并同意[用户协议](agreement.md)，否则请立即终止使用并彻底删除本项目。

## License

本项目基于 [MiGPT-Next](https://github.com/idootop/migpt-next) 进行二次开发，原项目版权归 [Del Wang](https://github.com/idootop) 所有。
本项目遵循原项目的 MIT 开源协议，保留原项目的版权声明。
