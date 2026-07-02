import { jsonEncode } from '@51migpt/utils/parse';
import { decodeMIoT, encodeMIoT, encodeQuery } from '../utils/codec.js';
import { Debugger } from '../utils/debug.js';
import { Http } from '../utils/http.js';
import { updateMiAccount } from './common.js';
import type { MIoTDevice, MiAccount } from './typing.js';

type MIoTAccount = MiAccount & { device: MIoTDevice };

export class MIoT {
  account: MIoTAccount;

  constructor(account: MIoTAccount) {
    this.account = account;
  }

  static async getDevice(account: MIoTAccount): Promise<MIoTAccount> {
    if (account.sid !== 'xiaomiio') {
      return account;
    }
    const devices = await MIoT.__callMIoT(account, 'POST', '/home/device_list', {
      getVirtualModel: false,
      getHuamiDevices: 0,
    });
    if (Debugger.debug) {
      console.log('🐛 MIoT 设备列表: ', jsonEncode(devices, { prettier: true }));
    }
    const device = (devices?.list ?? []).find((e: any) =>
      [e.did, e.name, e.mac].includes(account.did),
    );
    if (device) {
      account.device = device;
    }
    return account;
  }

  private static async __callMIoT(
    account: MIoTAccount,
    method: 'GET' | 'POST',
    path: string,
    _data?: any,
  ) {
    const url = `https://api.io.mi.com/app${path}`;
    const config = {
      account,
      setAccount: updateMiAccount(account),
      rawResponse: true,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'MICO/AndroidApp/@SHIP.TO.2A2FE0D7@/2.4.40',
        'x-xiaomi-protocal-flag-cli': 'PROTOCAL-HTTP2',
        'miot-accept-encoding': 'GZIP',
        'miot-encrypt-algorithm': 'ENCRYPT-RC4',
      },
      cookies: {
        countryCode: 'CN',
        locale: 'zh_CN',
        timezone: 'GMT+08:00',
        timezone_id: 'Asia/Shanghai',
        userId: account.userId,
        cUserId: account.pass?.cUserId,
        PassportDeviceId: account.deviceId,
        serviceToken: account.serviceToken,
        yetAnotherServiceToken: account.serviceToken,
      },
    };
    let res: any;
    const data = encodeMIoT(method, path, _data, account.pass!.ssecurity!);
    if (method === 'GET') {
      res = await Http.get(url, data, config);
    } else {
      res = await Http.post(url, encodeQuery(data as any), config);
    }
    if (typeof res.data !== 'string') {
      if (Debugger.debug) {
        console.error('❌ _callMIoT failed', res);
      }
      return undefined;
    }
    res = await decodeMIoT(
      account.pass!.ssecurity!,
      data._nonce,
      res.data,
      res.headers['miot-content-encoding'] === 'GZIP',
    );
    return res?.result;
  }

  private async _callMIoT(method: 'GET' | 'POST', path: string, data?: any) {
    return MIoT.__callMIoT(this.account, method, path, data);
  }

  /**
   * - datasource=1  优先从服务器缓存读取，没有读取到下发rpc；不能保证取到的一定是最新值
   * - datasource=2  直接下发rpc，每次都是设备返回的最新值
   * - datasource=3  直接读缓存；没有缓存的 code 是 -70xxxx；可能取不到值
   */
  private _callMIoTSpec(command: string, params: any, datasource = 2) {
    return this._callMIoT('POST', `/miotspec/${command}`, {
      params,
      datasource,
    });
  }

  /**
   * 获取 MIoT 设备列表
   */
  async getDevices(getVirtualModel = false, getHuamiDevices = 0) {
    const res = await this._callMIoT('POST', '/home/device_list', {
      getVirtualModel: getVirtualModel,
      getHuamiDevices: getHuamiDevices,
    });
    return res?.list;
  }

  /**
   * 获取 MIoT 设备属性值
   */
  async getProperty(scope: number, property: number) {
    const res = await this._callMIoTSpec('prop/get', [
      {
        did: this.account.device.did,
        siid: scope,
        piid: property,
      },
    ]);
    return (res ?? [])?.[0]?.value;
  }

  /**
   * 设置 MIoT 设备属性值
   */
  async setProperty(scope: number, property: number, value: any) {
    const res = await this._callMIoTSpec('prop/set', [
      {
        did: this.account.device.did,
        siid: scope,
        piid: property,
        value: value,
      },
    ]);
    return (res ?? [])?.[0]?.code === 0;
  }

  /**
   * 调用 MIoT 设备能力指令（你可以在 https://home.miot-spec.com/ 查询具体指令）
   *
   * 比如：
   *
   * ```ts
   * await MIoT.doAction(3, 1);
   * await MIoT.doAction(5, 1, "Hello world, 你好！");
   * ```
   */
  async doAction(scope: number, action: number, args: any = []) {
    const res = await this._callMIoTSpec('action', {
      did: this.account.device.did,
      siid: scope,
      aiid: action,
      in: Array.isArray(args) ? args : [args],
    });
    return res?.code === 0;
  }

  /**
   * 调用 MIoT 设备 RPC 指令
   */
  rpc(method: string, params: any, id = 1) {
    return this._callMIoT('POST', `/home/rpc/${this.account.device.did}`, {
      id,
      method,
      params,
    });
  }
}
