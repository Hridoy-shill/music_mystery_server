const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000


// middleware
app.use(cors());
app.use(express.json());

// jwt middleware
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    // console.log(authorization);
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'no authorization found' });
    }

    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
        if (error) {
            return res.status(403).send({ error: true, message: 'unauthorized access' })
        }
        req.decode = decode;
        // console.log('29 no line', decode);
        next();
    })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_ID}:${process.env.DB_PASS}@cluster0.fawgdio.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Collection'ss
        const userCollection = client.db("the-music-mystery").collection("users")
        const reviewsCollection = client.db("the-music-mystery").collection("reviews");
        const classCollection = client.db("the-music-mystery").collection("musicianClasses");

        // create JWT token
        app.post('/jwt', (req, res) => {
            const user = req.body;
            // console.log('user', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
            // console.log(token);
            res.send({ token })
        })

        // verifyAdmin middleware

        const verifyAdmin = async (req, res, next) => {
            const email = req.decode.email;
            // console.log(email);
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next()
        }

        // verifyAdmin middleware
        const verifyMusician = async (req, res, next) => {
            const email = req.decode.email;
            // console.log(email);
            const query = { email: email }
            const user = await userCollection.findOne(query);
            console.log("user from 86no line", user);
            if (user?.role !== 'musician') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next()
        }



        //---------- user's related api's ----------- //



        // get all existing user's from database
        app.get('/allUsers', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        // get admin user from allUsers
        app.get('/allUsers/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decode.email !== email) {
                return res.send({ admin: false })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })


        // post newUser in database
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        // make admin user
        app.patch('/allUsers/admin/:id', async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // update feedback
        app.patch('/feedback', async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // Approved class
        app.patch('/allClasses/Approved/:id', async (req, res) => {
            const id = req.params;
            // console.log("log from 149No line",id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'approved'
                },
            };

            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // Denied class
        app.patch('/allClasses/Denied/:id', async (req, res) => {
            const id = req.params;
            console.log("log from 164No line", id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'denied'
                },
            };

            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //---------- Musician's related api's ----------- //

        // get Musician user from allUsers
        app.get('/allUsers/musician/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            console.log("lineNo 181", email);
            const query = { email: email }
            const user = await userCollection.findOne(query);
            console.log("lineNo 184", user);
            const result = { musician: user?.role === 'musician' }
            res.send(result)
        })

        // get Musician users from allUsers on musician page
        app.get('/musicians', async (req, res) => {
            const query = { role: "musician" }
            const result = await userCollection.find(query).toArray();
            res.send(result)
        })

        // get all classes from database collection
        app.get('/musicianClasses', verifyJWT, verifyMusician, async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result)
        })

        // get specific musician classes
        app.get('/myClasses/:email', async (req, res) => {
            console.log("lineNo 204", req.params.email);
            const result = await classCollection.find({ email: req.params.email }).toArray()
            res.send(result)
        })

        // get musicians from allUsers
        app.get('/myClasses/:role', async (req, res) => {
            console.log("lineNo 211", req.params.role);
            const result = await userCollection.find({ role: req.params.email }).toArray()
            res.send(result)
        })

        //  New class save api in db
        app.post('/addClasses', async (req, res) => {
            const newClass = req.body;
            console.log("new class form 153no line", newClass);
            const result = await classCollection.insertOne(newClass);
            res.send(result);
        })

        // get all classes from database
        app.get('/allClasses', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result)
        })

        // Update musician added class
        app.get('/musicianClasses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.findOne(query)
            res.send(result)
        })

        // Update specific class details
        app.put('/updateClass/:id', async (req, res) => {
            const id = req.params.id;
            const body = req.body;
            const filter = { _id: new ObjectId(id) }

            const updateData = {
                $set: {
                    Price: body.Price,
                    Seats: body.Seats,
                    className: body.className,
                    photo: body.photo,
                }
            }
            const result = await classCollection.updateOne(filter, updateData);
            res.send(result)
        })

        // get feedback
        app.get('/feedBook/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.findOne(query)
            res.send(result)
        })

        // Update feedback specific class details
        app.put('/admin/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const body = req.body;
            const filter = { _id: new ObjectId(id) }

            const updateData = {
                $set: {
                    feedback: body.feedback
                }
            }
            const result = await classCollection.updateOne(filter, updateData);
            res.send(result)
        })

        // make Musician user
        app.patch('/allUsers/musician/:id', async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'musician'
                },
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // Delete user
        app.delete('/allUsers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        // read reviews data from Bistro-Db
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
        })

        // connecting api's
        app.get('/', (req, res) => {
            res.send('Hello World!')
        })

        app.listen(port, () => {
            console.log(`Example app listening on port ${port}`)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
