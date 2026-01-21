module.exports = {
  apps: [
    {
      name: "backend",
      script: "dist/server.js",
      cwd: __dirname,
      node_args: "--env-file=.env",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
