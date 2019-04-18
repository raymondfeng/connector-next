# loopback-connector-mongodb

The official MongoDB connector for the LoopBack framework.

Please see the full documentation at [loopback.io](http://loopback.io/doc/en/lb3/MongoDB-connector.html).

## Installation

In your application root directory, enter this command to install the connector:

```sh
npm install loopback-connector-mongodb --save
```

This installs the module from npm and adds it as a dependency to the application's `package.json` file.

If you create a MongoDB data source using the data source generator as described below, you don't have to do this, since the generator will run `npm install` for you.

## Creating a MongoDB data source

Use the [Data source generator](http://loopback.io/doc/en/lb3/Data-source-generator.html) to add a MongoDB data source to your application.  
The generator will prompt for the database server hostname, port, and other settings
required to connect to a MongoDB database.  It will also run the `npm install` command above for you.

The entry in the application's `/server/datasources.json` will look like this:

```javascript
"mydb": {
  "host": "myserver",
  "port": 27017,
  "url":  "",
  "database": "test",
  "password": "mypassword",
  "name": "mydb",
  "user": "me",
  "connector": "mongodb"  
}
```

Edit `datasources.json` to add any other additional properties that you require.

### Properties

<table>
  <thead>
    <tr>
    <th width="150">Property</th>
    <th width="80">Type</th>
    <th>Description</th>
    </tr>
  </thead> 
  <tbody>
    <tr>
      <td>connector</td>
      <td>String</td>
      <td>Connector name, either “loopback-connector-mongodb” or “mongodb”.</td>  
    </tr>  
    <tr>
      <td>database</td>
      <td>String</td>
      <td>Database name</td> 
      </tr>
    <tr>
      <td>host</td>
      <td>String</td>
      <td>Database host name</td>
    <tr>
      <td>password</td>
      <td>String</td>
      <td>Password to connect to database</td> 
    </tr>
    <tr>
      <td>port</td>
      <td>Number</td>
      <td>Database TCP port</td> 
    </tr>
    <tr>
      <td>url</td>
      <td>String</td>
      <td>Connection URL of form <code>mongodb://user:password@host/db</code>.  Overrides other connection settings.</td> 
    </tr>
    <tr>
       <td>username</td> 
       <td>String</td>
       <td>Username to connect to database</td>
    </tr>
  </tbody>
</table>

**NOTE**: In addition to these properties, you can use additional Single Server Connection parameters supported by [`node-mongodb-native`](http://mongodb.github.io/node-mongodb-native/core/driver/reference/connecting/connection-settings/).

## Type mappings

See [LoopBack types](http://loopback.io/doc/en/lb3/LoopBack-types.html) for details on LoopBack's data types.

### LoopBack to MongoDB types

Type conversion is mainly handled by Mongodb. See ['node-mongodb-native'](http://mongodb.github.io/node-mongodb-native/) for details.

## Customizing MongoDB configuration for tests/examples

By default, examples and tests from this module assume there is a MongoDB server
instance running on localhost at port 27017.

To customize the settings, you can drop in a `.loopbackrc` file to the root directory
of the project or the home folder.

**Note**: Tests and examples in this project configure the data source using the deprecated '.loopbackrc' file method,
which is not suppored in general.
For information on configuring the connector in a LoopBack application, please refer to [loopback.io](http://loopback.io/doc/en/lb2/MongoDB-connector.html).

The .loopbackrc file is in JSON format, for example:

    {
        "dev": {
            "mongodb": {
                "host": "127.0.0.1",
                "database": "test",
                "username": "youruser",
                "password": "yourpass",
                "port": 27017
            }
        },
        "test": {
            "mongodb": {
                "host": "127.0.0.1",
                "database": "test",
                "username": "youruser",
                "password": "yourpass",
                "port": 27017
            }
        }
    }

**Note**: username/password is only required if the MongoDB server has
authentication enabled.

### Additional Settings

allowExtendedOperators - ```false``` by default, ```true``` allows to use mongo operators like
```$currentDate, $inc, $max, $min, $mul, $rename, $setOnInsert, $set, $unset, $addToSet,
$pop, $pullAll, $pull, $pushAll, $push,  $bit ```.


enableGeoIndexing - ```false``` by default, ```true``` enables 2dsphere indexing for model properties
of type ```GeoPoint```. This allows for indexed ```near``` queries etc.

## Running tests

The tests in this repository are mainly integration tests, meaning you will need
to run them using our preconfigured test server.

1. Ask a core developer for instructions on how to set up test server
   credentials on your machine
2. `npm test`

## Running benchmarks

**Benchmarks must be run on a Unix-like operating system.**

```
make benchmarks
```

The results will be output in `./benchmarks/results.md`.

## Leak detection

Tests run for 100 iterations by default, but can be increased by setting the
env var `ITERATIONS`.

```
make leak-detection # run 100 iterations (default)
```

or

```
ITERATIONS=1000 make leak-detection # run 1000 iterations
```

## Release notes

  * 1.1.7 - Do not return MongoDB-specific _id to client API, except if specifically specified in the model definition
