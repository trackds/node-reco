import net from 'net';
import dgram from 'dgram';
import os from 'os';

function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minutes = now.getMinutes();

  return `${year}${month > 9 ? month : '0' + month}${day > 9 ? day : '0' + day}${hour > 9 ? hour : '0' + hour}${minutes > 9 ? minutes : '0' + minutes}`
}

type Flag = 'ON' | 'OFF';

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
  ip: string,

  /** 插座MAC地址 */
  mac: string,

  /** 设备序列号 */
  sn: string,

  /** 插座与远程复位器的连接状态 */
  res: number,

  /** 插座的状态 "1": ON ,"0": OFF */
  status: number,
}

function buildCmd (flag: Flag, delay = 0, broad = 1) {
  if (delay) {
    return `AT+YZDELAY=${broad},${flag},${delay},${getDateString()}\r\n`;
  } else {
    return `AT+YZSWITCH=${broad},${flag},${getDateString()}\r\n`;
  }
}

async function control (ipaddr = '192.168.1.10', cmd: Flag = 'ON', delay = 0, broad = 1) {
  const msg = Buffer.from(buildCmd(cmd, delay, broad))
  return _send(ipaddr, msg);
}

async function connect(ipaddr = '192.168.1.10'): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({
      host: ipaddr,
      port: 8899
    }, () => {
      resolve(socket);
    });
    socket.once('error', (err) => {
      reject(err);
    })
  });
}

async function _send (ipaddr = '192.168.1.10', msg: Buffer | string): Promise<string> {
  const socket = await connect(ipaddr);
  return new Promise((res, rej) => {

    socket.once('data', async (data) => {
      const str = data.toString();
      if (/ok/.test(str)) {
        res(str.trim().slice(4))
      } else {
        rej(str);
      }
      socket.end();
    });

    socket.write(msg, (err) => {
      if (err) {
        rej(err);
      }
    });
  });
}

/**
 * 立即或延时打开电源
 * @param ipaddr - 插座IP地址
 * @param delay - 延时执行（单位分钟），默认为0，表示立即执行
 * @param broad - 槽位号，默认为1
*/
export async function powerOn (ipaddr = '192.168.1.10', delay = 0, broad = 1) {
  return control(ipaddr, 'ON', delay, broad);
}

/**
 * 立即或延时关闭电源
 * @param ipaddr - 插座IP地址
 * @param delay - 延时执行（单位分钟），默认为0，表示立即执行
 * @param broad - 槽位号，默认为1
*/
export async function powerOff (ipaddr = '192.168.1.10', delay = 0, broad = 1) {
  return control(ipaddr, 'OFF', delay, broad);
}

/**
 * 获取指定插座的电源输出参数
 * @param ipaddr - 插座IP地址
*/
export async function info(ipaddr = '192.168.1.10') {
  const msg = `AT+YZOUT\r\n`;
  const retMsg = await _send(ipaddr, msg);
  const rets = retMsg.split(',');
  const ret: RecoPowerInfo = {
    I: Number.parseInt(rets[0]),
    U: Number.parseInt(rets[1]),
    F: Number.parseInt(rets[2]),
    P: Number.parseInt(rets[3]),
    PQ: Number.parseInt(rets[4]),
    E: Number.parseInt(rets[5]),
    EQ: Number.parseInt(rets[6]),
  };
  return ret
}

/**
 * 扫描指定网段内的插座
 * @param host - 插座IP地址或局域网广播地址
 * @param timeout - 扫描超时时间，默认500ms
 * @param max - 数组最大长度，默认65535个
*/
export async function discover (host = '192.168.1.255', timeout = 500, max = 65535) {
  return new Promise((res, rej) => {
    const udp = dgram.createSocket('udp4');
    const ret: RecoDeviceInfo[] = [];
    let timer: NodeJS.Timeout | null = null;
    let count = 0;
    let error: Error | null = null;
    udp.bind(48899, () => {
      udp.on('message', (msg, rinfo) => {
        const netIns = os.networkInterfaces();
        let isSelf = false;
        for (let key in netIns) {
          let ins = netIns[key];
          isSelf = ins.every((info) => (info.address === rinfo.address));

          if (isSelf) {
            break;
          }
        }

        if (!isSelf) {
          const str = msg.toString();
          const infoList = str.split(',');
          const dev: RecoDeviceInfo = {
            ip: "",
            mac: "",
            sn: "",
            res: 0,
            status: 0
          };
          if (infoList.length >= 5) {
            dev.ip = infoList[0],
            dev.mac = infoList[1],
            dev.sn = infoList[2],
            dev.res = Number.parseInt(infoList[3]),
            dev.status = Number.parseInt(infoList[4]),
    
            ret.push(dev);
            count ++;
    
            if (count >= max) {
              udp.close();
            }
          }
        }
      })

      udp.once('close', () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        if (error) {
          rej(error);
        } else {
          res(ret);
        }
      });

      udp.send('YZ-RECOSCAN', 48899, host, (err) => {
        if (err) {
          error = err;
        }
      })

      timer = setTimeout(() => {
        udp.close();
      }, timeout);
    })
  });
}

export default {
  powerOn,
  powerOff,
  info,
  discover
}