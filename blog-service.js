require('dotenv').config();

const Sequelize = require('sequelize');

// Initialize Sequelize with environment variables
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
        port: process.env.DB_PORT,
        dialectOptions: {
            ssl: {
                require: process.env.DB_SSL === 'require',
                rejectUnauthorized: false
            },
        },
        query: { raw: true },
    }
);

// Define Post model
const Post = sequelize.define('Post', {
    body: Sequelize.TEXT,
    title: Sequelize.STRING,
    postDate: Sequelize.DATE,
    featureImage: Sequelize.STRING,
    published: Sequelize.BOOLEAN,
});

// Define Category model
const Category = sequelize.define('Category', {
    category: Sequelize.STRING,
});

// Establish relationships
Post.belongsTo(Category, { foreignKey: 'category' });

// Exported methods
module.exports = {
    // Initialize database and sync models
    initialize: function () {
        return sequelize.sync();
    },

    // Retrieve all posts
    getAllPosts: function () {
        return Post.findAll();
    },

    // Retrieve posts by category
    getPostsByCategory: function (category) {
        return Post.findAll({ where: { category } });
    },

    // Retrieve a post by ID
    getPostById: function (id) {
        return Post.findByPk(id);
    },

    // Add a new post
    addPost: function (postData) {
        postData.published = !!postData.published; // Convert to boolean
        if (postData.category === "") postData.category = null; // Handle empty category
        postData.postDate = new Date(); // Set post date
        return Post.create(postData);
    },

    // Delete a post by ID
    deletePostById: function (id) {
        return Post.destroy({ where: { id } });
    },

    // Retrieve only published posts
    getPublishedPosts: function () {
        return Post.findAll({ where: { published: true } });
    },

    // Retrieve all categories
    getCategories: function () {
        return Category.findAll();
    },

    // Add a new category
    addCategory: function (categoryData) {
        if (categoryData.category === "") categoryData.category = null; // Handle empty category
        return Category.create(categoryData);
    },

    // Delete a category by ID
    deleteCategoryById: function (id) {
        return Category.destroy({ where: { id } });
    },
};
