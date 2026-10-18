'use strict';

const config = require('../config');
const routing = require('./routing');

const GEOIP_URL =
  'https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat';
const GEOSITE_URL =
  'https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat';

/**
 * Happ matches plain domains, `geosite:` / `geoip:` refs and `regexp:`.
 * Strip Xray's `full:` / `domain:` prefixes down to plain domains.
 */
function normalizeSite(entry) {
  const s = String(entry || '').trim();
  if (!s) return null;
  if (/^(geosite|geoip|regexp|keyword|ext):/i.test(s)) return s;
  return s.replace(/^(full|domain):/i, '');
}

function unique(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

/** Builds a Happ routing profile (Happ schema, NOT Xray schema). */
function buildRoutingProfile() {
  return {
    Name: config.PROFILE_TITLE,
    GlobalProxy: 'true',

    RemoteDNSType: 'DoH',
    RemoteDNSDomain: 'https://cloudflare-dns.com/dns-query',
    RemoteDNSIP: '1.1.1.1',
    DomesticDNSType: 'DoH',
    DomesticDNSDomain: 'https://dns.google/dns-query',
    DomesticDNSIP: '8.8.8.8',

    Geoipurl: GEOIP_URL,
    Geositeurl: GEOSITE_URL,

    DnsHosts: {
      'cloudflare-dns.com': '1.1.1.1',
      'dns.google': '8.8.8.8'
    },

    DirectSites: unique(routing.DIRECT_DOMAINS.map(normalizeSite)),
    DirectIp: [
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      '169.254.0.0/16',
      '224.0.0.0/4',
      '255.255.255.255'
    ],

    ProxySites: unique(routing.PROXY_DOMAINS.map(normalizeSite)),
    ProxyIp: unique(routing.PROXY_IPS),

    BlockSites: [],
    BlockIp: [],

    DomainStrategy: 'AsIs',
    FakeDNS: 'false'
  };
}

/** happ://routing/onadd/<base64(profile)> — the value of the `Routing` header. */
function buildRoutingLink() {
  const json = JSON.stringify(buildRoutingProfile());
  return `happ://routing/onadd/${Buffer.from(json, 'utf8').toString('base64')}`;
}

module.exports = { buildRoutingProfile, buildRoutingLink, normalizeSite };
