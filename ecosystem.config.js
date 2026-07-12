module.exports = {
  apps: [{
    name: 'en-er-inventory',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
    },
    restart_delay: 3000,
    max_restarts: 10,
    watch: false,
  }],
}
