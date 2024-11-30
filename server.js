require('dotenv').config(); // Load environment variables

const express = require('express');
const blogData = require("./blog-service");
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const exphbs = require("express-handlebars");
const path = require("path");
const stripJs = require('strip-js');

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true,
});

const upload = multer();

app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    helpers: {
        navLink: function (url, options) {
            return '<li' +
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') +
                '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        },
        safeHTML: function (context) {
            return stripJs(context);
        }
    }
}));

app.set('view engine', '.hbs');

app.use(express.static('public'));

// Middleware for handling form data
app.use(express.urlencoded({ extended: true }));

app.use(function (req, res, next) {
    let route = req.path.substring(1);
    app.locals.activeRoute = (route == "/") ? "/" : "/" + route.replace(/\/(.*)/, "");
    app.locals.viewingCategory = req.query.category;
    next();
});

// Routes
app.get('/', (req, res) => {
    res.redirect("/blog");
});

app.get('/about', (req, res) => {
    res.render("about");
});

app.get('/blog', async (req, res) => {
    let viewData = {};
    try {
        let posts = [];
        if (req.query.category) {
            posts = await blogData.getPublishedPostsByCategory(req.query.category);
        } else {
            posts = await blogData.getPublishedPosts();
        }
        posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
        viewData.posts = posts;
        viewData.post = posts[0];
    } catch (err) {
        viewData.message = "no results";
    }

    try {
        let categories = await blogData.getCategories();
        viewData.categories = categories;
    } catch (err) {
        viewData.categoriesMessage = "no results";
    }

    res.render("blog", { data: viewData });
});

app.get('/posts', (req, res) => {
    let queryPromise = null;
    if (req.query.category) {
        queryPromise = blogData.getPostsByCategory(req.query.category);
    } else if (req.query.minDate) {
        queryPromise = blogData.getPostsByMinDate(req.query.minDate);
    } else {
        queryPromise = blogData.getAllPosts();
    }

    queryPromise.then(data => {
        if (data.length > 0) {
            res.render("posts", { posts: data });
        } else {
            res.render("posts", { message: "no results" });
        }
    }).catch(err => {
        res.render("posts", { message: "no results" });
    });
});

app.get('/categories', (req, res) => {
    blogData.getCategories()
        .then(data => {
            if (data.length > 0) {
                res.render("categories", { categories: data });
            } else {
                res.render("categories", { message: "no results" });
            }
        })
        .catch(err => {
            res.render("categories", { message: "no results" });
        });
});

app.get('/categories/add', (req, res) => {
    res.render("addCategory");
});

app.post('/categories/add', (req, res) => {
    blogData.addCategory(req.body)
        .then(() => res.redirect("/categories"))
        .catch(err => res.status(500).send("Unable to add category"));
});

app.get('/categories/delete/:id', (req, res) => {
    blogData.deleteCategoryById(req.params.id)
        .then(() => res.redirect("/categories"))
        .catch(err => res.status(500).send("Unable to remove category"));
});

app.get('/posts/delete/:id', (req, res) => {
    blogData.deletePostById(req.params.id)
        .then(() => res.redirect("/posts"))
        .catch(err => res.status(500).send("Unable to remove post"));
});

app.post("/posts/add", upload.single("featureImage"), (req, res) => {
    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream(
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        async function upload(req) {
            let result = await streamUpload(req);
            return result;
        }

        upload(req).then((uploaded) => {
            processPost(uploaded.url);
        });
    } else {
        processPost("");
    }

    function processPost(imageUrl) {
        req.body.featureImage = imageUrl;
        blogData.addPost(req.body)
            .then(() => res.redirect("/posts"))
            .catch(err => res.status(500).send(err));
    }
});

app.get('/posts/add', (req, res) => {
    res.render("addPost");
});

app.use((req, res) => {
    res.status(404).render("404");
});

blogData.initialize().then(() => {
    app.listen(HTTP_PORT, () => {
        console.log('server listening on: ' + HTTP_PORT);
    });
}).catch((err) => {
    console.log(err);
});
