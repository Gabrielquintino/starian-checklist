const target = process.env['API_PROXY_TARGET'] ?? 'http://laravel:8000';

module.exports = {
  '/tarefas': {
    target,
    changeOrigin: true
  }
};
