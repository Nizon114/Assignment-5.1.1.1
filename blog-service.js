require('dotenv').config(); // Load environment variables

const Sequelize = require('sequelize');

// Set up Sequelize connection
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
        port: process.env.DB_PORT,
        dialectOptions: {
            ssl: { rejectUnauthorized: false },
        },
        query: { raw: true },
    }
);

// Define models
const Post = sequelize.define('Post', {
    body: Sequelize.TEXT,
    title: Sequelize.STRING,
    postDate: Sequelize.DATE,
    featureImage: Sequelize.STRING,
    published: Sequelize.BOOLEAN,
});

const Category = sequelize.define('Category', {
    category: Sequelize.STRING,
});

// Relationships
Post.belongsTo(Category, { foreignKey: 'category' });

module.exports = {
    initialize: function () {
        return sequelize.sync();
    },
    getAllPosts: function () {
        return Post.findAll();
    },
    getPostsByCategory: function (category) {
        return Post.findAll({ where: { category } });
    },
    getPostById: function (id) {
        return Post.findByPk(id);
    },
    addPost: function (postData) {
        postData.published = !!postData.published;
        return Post.create(postData);
    },
    deletePostById: function (id) {
        return Post.destroy({ where: { id } });
    },
    getPublishedPosts: function () {
        return Post.findAll({ where: { published: true } });
    },
    getCategories: function () {
        return Category.findAll();
    },
    addCategory: function (categoryData) {
        return Category.create(categoryData);
    },
    deleteCategoryById: function (id) {
        return Category.destroy({ where: { id } });
    },
};
