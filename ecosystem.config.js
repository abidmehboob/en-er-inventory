module.exports = {
  apps: [{
    name: 'en-er-inventory',
    script: 'server.js',
    cwd: '/var/www/en-er-inventory',
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
