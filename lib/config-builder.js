'use strict';

const config = require('../config');
const routing = require('./routing');

/* ------------------------------------------------------------------ *
 *  Xray / Happ config body
 * ------------------------------------------------------------------ */

function buildConfig(keyName, record) {
  // Hysteria auth credential. A per-key override wins; otherwise the key
  // name itself is used as the credential.
  const auth = (record && record.auth) || keyName;

  return {
    remarks: keyName,

    inbounds: [
      {
        tag: 'socks',
        listen: '127.0.0.1',
        port: 10808,
        protocol: 'socks',
        settings: {
          auth: 'noauth',
          udp: true
        },
        sniffing: {
          enabled: true,
          destOverride: ['http', 'tls', 'quic'],
          routeOnly: false
        }
      },
      {
        tag: 'http',
        listen: '127.0.0.1',
        port: 10809,
        protocol: 'http',
        sniffing: {
          enabled: true,
          destOverride: ['http', 'tls', 'quic'],
          routeOnly: false
        },
        settings: {
          auth: 'noauth'
        }
      }
    ],

    outbounds: [
      {
        tag: 'proxy',
        protocol: 'hysteria',
        settings: {
          address: config.HYSTERIA.address,
          port: config.HYSTERIA.port,
          version: config.HYSTERIA.version
        },
        streamSettings: {
          network: 'hysteria',
          security: 'tls',
          tlsSettings: {
            serverName: config.HYSTERIA.serverName,
            alpn: config.HYSTERIA.alpn
          },
          hysteriaSettings: {
            version: config.HYSTERIA.version,
            auth: auth
          }
        }
      },
      {
        tag: 'direct',
        protocol: 'freedom'
      }
    ],

    routing: {
      domainStrategy: 'AsIs',
      rules: [
        {
          type: 'field',
          domain: routing.PROXY_DOMAINS,
          outboundTag: 'proxy'
        },
        {
          type: 'field',
          ip: routing.PROXY_IPS,
          outboundTag: 'proxy'
        },
        ...routing.PROXY_PORT_RULES.map((rule) => ({
          type: 'field',
          network: rule.network,
          port: rule.port,
          outboundTag: 'proxy'
        })),
        {
          type: 'field',
          domain: routing.DIRECT_DOMAINS,
          outboundTag: 'direct'
        },
        {
          type: 'field',
          network: 'tcp,udp',
          outboundTag: 'direct'
        }
      ]
    },

    log: {
      access: '/data/user/0/com.happproxy/files/logs/access/access_log.txt',
      error: '/data/user/0/com.happproxy/files/logs/error/1792242339042_error_log.txt'
    }
  };
}

/* ------------------------------------------------------------------ *
 *  Full Happ subscription payload (metadata comments + JSON body)
 * ------------------------------------------------------------------ */

function buildSubscription(keyName, record) {
  const expireUnix = Math.floor(record.expiresAt / 1000);
  const body = JSON.stringify(buildConfig(keyName, record), null, 2);

  const header = [
    `#profile-title: ${config.PROFILE_TITLE}`,
    `#subscription-userinfo: upload=0; download=0; total=${config.TOTAL_BYTES}; expire=${expireUnix}`,
    `#profile-update-interval: ${config.UPDATE_INTERVAL}`,
    ''
  ].join('\n');

  return `${header}\n${body}`;
}

module.exports = {
  buildConfig,
  buildSubscription
};
