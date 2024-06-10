const express = require('express');
const app = express();

//dotenv
require('dotenv').config();
const cors = require('cors');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');


const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://meal-lounge.web.app'],
    credentials: true,
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
//jwt

//form
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.use(cookieParser())


const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


//middlewares
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "Unauthorized User" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(401).send({ message: "Unauthorized Access" })
        }
        req.user = decoded;

        next()
    })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iduz7rm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const usersCollection = client.db("mealLounge").collection("users")
        const mealsCollection = client.db("mealLounge").collection("meals")
        const membershipsCollection = client.db("mealLounge").collection("memberships")
        const subscribersCollection = client.db("mealLounge").collection("subscribers")
        const requestedCollection = client.db("mealLounge").collection("requested")
        const upcomingMealsCollection = client.db("mealLounge").collection("upcoming")
        const likesCollection = client.db("mealLounge").collection("likes")
        const reviewsCollection = client.db("mealLounge").collection("reviews")


        //verify admin middleware
        const verifyAdmin = async (req, res, next) => {
            const user = req.user;
            const query = { email: user?.email };
            const result = await usersCollection.findOne(query)
            if (!result || result?.role !== 'admin') {
                return res.status(401).send({ message: "Unauthorized Access" })
            }

            next();
        }


        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        app.put('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email }

            if (user?.email == null) {
                return;
            }
            if (user?.name == null) {
                return
            }

            const isExisted = await usersCollection.findOne(query);
            if (isExisted) {
                return res.send(isExisted)
            }

            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ...user,
                    timestamp: Date.now()
                }
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        //update a user
        app.patch('/users/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const userData = req.body;
            const updateDoc = {
                $set: {
                    ...userData
                }
            }
            const result = await usersCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query);
            res.send(result)
        })

        //get all meals
        app.get('/meals', async (req, res) => {
            const result = await mealsCollection.find().toArray();
            res.send(result);
        })

        //get a meal
        app.get('/meal/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await mealsCollection.findOne(query);
            res.send(result)
        })

        //add a meal
        app.post('/meals', verifyToken, async (req, res) => {
            const meal = req.body;
            const result = await mealsCollection.insertOne(meal);
            res.send(result)
        })

        //delete a meal
        app.delete('/meal/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await mealsCollection.deleteOne(query);
            res.send(result)
        })

        //update a meal
        app.put('/meal/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const meal = req.body
            const updateDoc = {
                $set: {
                    ...meal
                }
            }
            const result = await mealsCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        //update like
        app.patch('/like-meal/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const meals = req.body;
            const updateDoc = {
                $set: {
                    likes: parseInt(meals.likes) + 1
                }
            }
            const result = await mealsCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        //requested meal
        app.post('/requested', verifyToken, async (req, res) => {
            const meal = req.body;
            const result = await requestedCollection.insertOne(meal);
            res.send(result)
        })

        //get all req meals
        app.get('/requests', async (req, res) => {
            const result = await requestedCollection.find().toArray();
            res.send(result)
        })

        //delete requested meal
        app.delete('/requested/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await requestedCollection.deleteOne(query);
            res.send(result)
        })


        //get requested meals
        app.get('/requests/:stat', async (req, res) => {
            const stat = req.params.stat;
            const query = { status: stat }
            const result = await requestedCollection.find(query).toArray()
            res.send(result)
        })


        //make delivered
        app.patch('/requested/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const meal = req.body;
            const updateDoc = {
                $set: {
                    ...meal,
                }
            }
            const result = await requestedCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        //memberships
        app.get('/memberships', async (req, res) => {
            const result = await membershipsCollection.find().toArray();
            res.send(result)
        })


        //package
        app.get('/membership/:package', async (req, res) => {
            const package = req.params.package;
            const query = { packageName: package };
            const result = await membershipsCollection.findOne(query);
            res.send(result)
        })


        //get all upcoming meals
        app.get('/upcoming', async (req, res) => {
            const result = await upcomingMealsCollection.find().toArray();
            res.send(result)
        })


        //likes collection and stop double like by one user
        app.post('/likes/:email', async (req, res) => {
            const { param1, param2, param3 } = req.body;
            //param1:
            //param2: food title
            //param3: destructured meal data

            // if(param3.title == param2 && param3.email == email) {
            //     return
            // }
            const email = req.params.email;
            if (param3.email !== email && !param2) {
                return
            }
            const result = await likesCollection.insertOne(param3);
            res.send(result)
        })

        //get all likes
        app.get('/likes', async (req, res) => {
            const result = await likesCollection.find().toArray();
            res.send(result)
        })



        //payment integration
        app.post("/create-payment-intent", verifyToken, async (req, res) => {
            const price = req.body.price;
            const priceInCent = parseFloat(price) * 100

            if (!price || priceInCent < 1) return

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: priceInCent,
                currency: "usd",
                // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });


        //add to subscriber
        app.post('/subscribers', async (req, res) => {
            const subscriber = req.body;
            const result = await subscribersCollection.insertOne(subscriber);
            res.send(result)
        })


        //get all reviews
        app.get('/reviews', verifyToken, async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result)
        })

        app.get('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await reviewsCollection.find(query).toArray();
            res.send(result)
        })

        //post in reviews
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result)
        })

        //update a review
        app.patch('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const review = req.body;
            console.log(review)
            const updateDoc = {
                $set: {
                    ...review
                }
            }
            const result = await reviewsCollection.updateOne(query, updateDoc)
            res.send(result)
        })

        //delete a review
        app.delete('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await reviewsCollection.deleteOne(query)
            res.send(result)
        })




        //jwt
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '365d'
            })
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            }).send({ success: true })
        })

        app.get('/logout', async (req, res) => {
            try {
                res.clearCookie('token', {
                    maxAge: 0,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                }).send({ success: true })
            } catch (error) {
                res.status(500).send(error)
            }
        })



        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send("Meal Lounge server is running")
})

module.exports = app;