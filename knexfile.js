module.exports = {

  development: {
    client: 'pg',
    connection: 'postgres://localhost/teamcred'
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL
  }

};
