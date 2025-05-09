const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('aydocorp_db', 'aydocorp', 'IHateGeico1!', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false, // set to true for SQL query logs
});

module.exports = sequelize; 