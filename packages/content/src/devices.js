/**
 * NetCity Device Catalog (Version 2.0, Section 4.3 & 7.3)
 */

export const DEVICE_CATALOG = {
  server: {
    type: 'server',
    name: 'Server',
    icon: '🖥️',
    cost: 0,
    ports: 4,
    color: '#2ec4b6',
    description: 'Receives requests and sends replies.'
  },
  access_point: {
    type: 'access_point',
    name: 'Wireless Access Point',
    icon: '📡',
    cost: 8,
    ports: 1, // 1 wired uplink port + wireless radius
    range: 6,
    color: '#06d6a0',
    description: 'Connects phones and tablets wirelessly within a 6-square radius.'
  },
  cabinet: {
    type: 'cabinet',
    name: 'Street Cabinet',
    icon: '🗄️',
    cost: 2,
    ports: 4, // 4 ports limit
    color: '#708090',
    description: 'A passive junction box that gathers multiple cables into one route.'
  },
  hub: {
    type: 'hub',
    name: 'Network Hub',
    icon: '🔀',
    cost: 4,
    ports: 4, // 4 ports limit
    color: '#f77f00',
    description: 'Copies every packet to all ports. Simultaneous packets collide.'
  },
  switch: {
    type: 'switch',
    name: 'Network Switch',
    icon: '📦',
    cost: 10,
    ports: 4, // 4 ports limit
    color: '#3a86ff',
    description: 'Learns device addresses and forwards packets directly without collisions.'
  },
  router: {
    type: 'router',
    name: 'Network Router',
    icon: '🧭',
    cost: 20,
    ports: 4,
    color: '#e63946',
    description: 'Connects different networks, routes packets between subnets and provides the default gateway.'
  },
  dhcp_server: {
    type: 'dhcp_server',
    name: 'DHCP Server',
    icon: '📋',
    cost: 15,
    ports: 4,
    color: '#f4a261',
    description: 'Automatically hands out IP addresses, subnet masks, and default gateways to joining devices.'
  },
  dns_server: {
    type: 'dns_server',
    name: 'DNS Server',
    icon: '📖',
    cost: 15,
    ports: 4,
    color: '#9b5de5',
    description: 'Translates human-friendly names (like school.net) into numerical IP addresses.'
  },
  web_server: {
    type: 'web_server',
    name: 'Web Server',
    icon: '🌐',
    cost: 20,
    ports: 4,
    color: '#2ec4b6',
    description: 'Answers HTTP webpage requests and sends back response packets to clients.'
  },
  email_server: {
    type: 'email_server',
    name: 'Email Server',
    icon: '✉️',
    cost: 20,
    ports: 4,
    color: '#00b4d8',
    description: 'Passes email messages between local and remote mail depots.'
  },
  firewall: {
    type: 'firewall',
    name: 'Firewall',
    icon: '🛡️',
    cost: 25,
    ports: 4,
    color: '#d90429',
    description: 'Checks packets against rule cards (Allow/Block by IP, port or subnet) and drops unauthorized traffic.'
  },
  vpn_gateway: {
    type: 'vpn_gateway',
    name: 'VPN Gateway',
    icon: '🔒',
    cost: 30,
    ports: 4,
    color: '#5a189a',
    description: 'Encapsulates packets into an encrypted tunnel across untrusted public networks.'
  },
  load_balancer: {
    type: 'load_balancer',
    name: 'Load Balancer',
    icon: '⚖️',
    cost: 30,
    ports: 4,
    color: '#0077b6',
    description: 'Distributes incoming client traffic evenly across multiple server backends.'
  },
  backup_power: {
    type: 'backup_power',
    name: 'Backup Power UPS',
    icon: '🔋',
    cost: 15,
    ports: 4,
    color: '#ffb703',
    description: 'Keeps critical network devices powered during municipal grid power cuts.'
  }
};
