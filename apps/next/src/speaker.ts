import type { ISpeaker } from '@51migpt/engine/base';
import { sleep } from '@51migpt/utils';
import { MiService } from './service.js';

class SpeakerManager implements ISpeaker {
  /**
   * 播放文字、音频链接
   */
  async play({ text, url }: { text?: string; url?: string } = {}) {
    if (!MiService.MiNA) {
      return false;
    }
    if (url) {
      return MiService.MiNA.play({ url });
    }
    if (text) {
      return MiService.MiNA.play({ text });
    }
    return false;
  }

  /**
   * 中断原来小爱的运行
   *
   * 多步中断策略：
   * 1. 停止 mediaplayer（强制停止当前播放）
   * 2. 暂停播放（双重保险，确保停止）
   * 3. 调用 mibrain stop（针对小爱 TTS 服务）
   * 4. 播放空文本抢占音频通道（防止小爱继续播放）
   *
   * 注意：中断后需要等待约 100-300ms 才能开始新的 TTS 播放
   */
  async abortXiaoAI(maxRetry = 2): Promise<boolean> {
    if (!MiService.MiNA) {
      return false;
    }

    try {
      // 使用 MiNA 提供的专用中断方法
      const result = await MiService.MiNA.interrupt(maxRetry);

      // 等待设备状态稳定
      await sleep(100);

      return result;
    } catch (error) {
      if (MiService.config?.debug) {
        console.error('❌ abortXiaoAI 失败:', error);
      }
      return false;
    }
  }
}

export const MiSpeaker = new SpeakerManager();
