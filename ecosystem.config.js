module.exports = {
  apps: [{
    name: 'qaswa-inventory',
    script: 'node_modules/.bin/next',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    restart_delay: 3000,
    max_restarts: 10,
    watch: false,
  }],
}
