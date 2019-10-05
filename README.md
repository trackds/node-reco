# node-reco
Reco LAN control API

# Install
```
npm install node-reco
```

# Promise API
```javascript
const Reco = require('node-reco');

/* 立刻打开电源 */
Reco.powerOn('192.168.29.66').then(() => {/.../});

/* 立刻关闭电源 */
Reco.powerOff('192.168.29.66').then(() => {/.../});

/* 延时1分钟后打开电源 */
Reco.powerOn('192.168.29.66', 1).then(() => {/.../});

/* 延时1分钟后关闭电源 */
Reco.powerOff('192.168.29.66', 1).then(() => {/.../});

/* 获取当前输出参数 */
Reco.info('192.168.29.66').then((info) => {console.log(info)});
//=> { I: 8, U: 23678, F: 4999, P: 74, PQ: 0, E: 22015, EQ: 0 }

/* 扫描192.168.29.xx网段内所有的Reco插座 */
Reco.discover("192.168.29.255").then((devs) => {console.log(devs)});
/*
=> [
  {
    ip: '192.168.29.66',
    mac: 'ACCF23484D70',
    sn: '040002298',
    res: 1,
    status: 1
  }
]
*/

```

# 类型定义
```typescript
export interface RecoPowerInfo {
    /** 电流值 0.01A */
    I: number;
    /** 电压值 0.01V */
    U: number;
    /** 频率值 0.01Hz */
    F: number;
    /** 有功功率值 0.1W */
    P: number;
    /** 无功功率值 0 */
    PQ: number;
    /** 有功能量值 1WH */
    E: number;
    /** 无功能量值 0 */
    EQ: number;
}

export interface RecoDeviceInfo {
    /** 插座IP地址 */
    ip: string;
    /** 插座MAC地址 */
    mac: string;
    /** 设备序列号 */
    sn: string;
    /** 插座与远程复位器的连接状态 */
    res: number;
    /** 插座的状态 "1": ON ,"0": OFF */
    status: number;
}

/**
 * 立即或延时打开电源
 * @param ipaddr - 插座IP地址
 * @param delay - 延时执行（单位分钟），默认为0，表示立即执行
 * @param broad - 槽位号，默认为1
*/
export declare function powerOn(ipaddr?: string, delay?: number, broad?: number): Promise<string>;

/**
 * 立即或延时关闭电源
 * @param ipaddr - 插座IP地址
 * @param delay - 延时执行（单位分钟），默认为0，表示立即执行
 * @param broad - 槽位号，默认为1
*/
export declare function powerOff(ipaddr?: string, delay?: number, broad?: number): Promise<string>;

/**
 * 获取指定插座的电源输出参数
 * @param ipaddr - 插座IP地址
*/
export declare function info(ipaddr?: string): Promise<RecoPowerInfo>;

/**
 * 扫描指定网段内的插座
 * @param host - 插座IP地址或局域网广播地址
 * @param timeout - 扫描超时时间，默认500ms
 * @param max - 数组最大长度，默认65535个
*/
export declare function discover(host?: string, timeout?: number, max?: number): Promise<unknown>;

declare const _default: {
    powerOn: typeof powerOn;
    powerOff: typeof powerOff;
    info: typeof info;
    discover: typeof discover;
};
export default _default;
```