module.exports = {
  apps: [
    {
      name: "backend",
      script: "dist/server.js",
      cwd: __dirname,
      node_args: "--env-file=.env --max-http-header-size=65536",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
